import {
  XENESIS_CONNECTION_MESSENGER_VIEW_SECTION_DEFINITIONS,
  XENESIS_CONNECTION_MESSENGER_VIEW_SECTION_IDS,
  XENESIS_CONNECTION_PROVIDER_VIEW_SECTION_DEFINITIONS,
  XENESIS_CONNECTION_PROVIDER_VIEW_SECTION_IDS,
  XENESIS_CONNECTION_TOOL_VIEW_SECTION_DEFINITIONS,
  XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS,
  type XenesisConnectionMessengerViewSectionId,
  type XenesisConnectionProviderViewSectionId,
  type XenesisConnectionToolViewSectionId,
} from './xenesisConnections';
import {
  buildXenesisNaturalLanguagePlan,
  findXenesisNaturalContextRule,
  findXenesisNaturalWordsTarget,
  isXenesisNaturalConnectionMessengerTarget,
  isXenesisNaturalConnectionToolTarget,
  isXenesisNaturalPlannedGoogleToolTarget,
  matchesXenesisNaturalContextRule,
  matchesXenesisNaturalContextRules,
  XENESIS_DESK_ACTION_APPROVAL_STATE,
  XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
  XENESIS_NATURAL_ACTION_INBOX_CONTEXT_WORDS,
  XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
  XENESIS_NATURAL_ALL_SCOPE_WORDS,
  XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS,
  XENESIS_NATURAL_APP_STATUS_TARGET_WORDS,
  XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS,
  XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS,
  XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
  XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
  XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
  XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CHANNEL_TEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES,
  XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_TOOL_OPEN_REASON,
  XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS,
  XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND,
  XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL,
  XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
  XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS,
  XENESIS_NATURAL_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS,
  XENESIS_NATURAL_FILE_CONTEXT_WORDS,
  XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS,
  XENESIS_NATURAL_FILTER_CONTEXT_WORDS,
  XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
  XENESIS_NATURAL_GATEWAY_RESTART_CONTEXT_WORDS,
  XENESIS_NATURAL_GATEWAY_START_CONTEXT_WORDS,
  XENESIS_NATURAL_GATEWAY_STOP_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_OPEN_WORDS,
  XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
  XENESIS_NATURAL_LIST_OR_SHOW_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_SETUP_PACKET_CONTEXT_WORDS,
  XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
  XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS,
  XENESIS_NATURAL_OPEN_OR_SHOW_WORDS,
  XENESIS_NATURAL_OTHER_SCOPE_WORDS,
  XENESIS_NATURAL_PANE_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
  XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
  XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
  XENESIS_NATURAL_RESIZE_COMMAND_WORDS,
  XENESIS_NATURAL_RIGHT_SCOPE_WORDS,
  XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
  XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
  XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS,
  XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
  XENESIS_NATURAL_TASK_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_ID_PREFIX,
  XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
  XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
  XENESIS_NATURAL_XENESIS_CONTEXT_WORDS,
  type XenesisNaturalCatalogActionRule,
  type XenesisNaturalConnectionAggregateOpenRule,
  type XenesisNaturalConnectionAggregateOpenRuleStage,
  type XenesisNaturalConnectionAggregateRuleMatchKind,
  type XenesisNaturalConnectionAggregateStatusRule,
  type XenesisNaturalConnectionAggregateStatusRuleStage,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalConnectionTargetActionRule,
  type XenesisNaturalCoreToolTarget,
  type XenesisNaturalDeskActionDescriptor,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalDeskActionTemplateDescriptor,
  type XenesisNaturalGuideOpenRule,
  type XenesisNaturalGuideStatusRule,
  type XenesisNaturalLanguagePlan,
  type XenesisNaturalOnboardingActionRule,
  type XenesisNaturalProviderActionRule,
  type XenesisNaturalViewTarget,
  type XenesisNaturalWordsTarget,
} from './xenesisNaturalLanguageCatalog';
import {
  type SettingsCategory,
  type SettingsCategoryId,
  VISIBLE_SETTINGS_CATEGORIES,
} from './xenesisSettingsCatalog.mjs';

export const XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS = {
  placement: 'tab',
  windowState: 'document',
} as const;

export const XENESIS_NATURAL_DESK_ACTION_ARGS = {
  agentId: (agentId: string) => ({ agentId }),
  agentSubmit: (agentId: string, text: string) => ({ agentId, text }),
  channel: (channel: string) => ({ channel }),
  channelVisible: (channel: string) => ({ channel, ensureVisible: true }),
  dockPaneArrange: (mode: string) => ({ useActive: true, mode }),
  dockSize: (side: string, size: number) => ({ [side]: size }),
  dockWindowArrange: (windowState: string | undefined, mode: string) => ({
    windowState: windowState || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.windowState,
    mode,
  }),
  empty: () => ({}),
  ensureVisible: () => ({ ensureVisible: true }),
  explorerPath: (path: string) => ({ path }),
  filterQuery: (query: string) => ({ query }),
  openFileVisible: (id: string, openFile: boolean) => ({
    id,
    ensureVisible: true,
    ...(openFile ? { openFile: true } : {}),
  }),
  optionalFilePath: (filePath: string) => (filePath ? { filePath } : {}),
  mcpInstallApply: (id: string) => ({ id, target: 'codex' }),
  placement: (placement: string | undefined) => ({
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  prompt: (prompt: string) => ({ prompt }),
  provider: (provider: string) => ({ provider }),
  providerVisible: (provider: string) => ({ provider, ensureVisible: true }),
  providerViewSectionVisible: (provider: string, section: string) => ({ provider, section, ensureVisible: true }),
  presetId: (presetId: string) => ({ presetId }),
  settingsCategory: (category: string, placement: string | undefined) => ({
    category,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
    ensureVisible: true,
  }),
  targetId: (id: string) => ({ id }),
  targetIdVisible: (id: string) => ({ id, ensureVisible: true }),
  terminalMany: (count: number, placement: string | undefined) => ({
    count,
    shell: XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL,
    command: XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND,
    idPrefix: XENESIS_NATURAL_TERMINAL_ID_PREFIX,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  terminalRun: (command: string, placement: string | undefined) => ({
    command: command || XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND,
    shell: XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  tool: (tool: string) => ({ tool }),
  messengerViewSectionVisible: (id: string, section: string) => ({ id, section, ensureVisible: true }),
  toolViewSectionVisible: (id: string, section: string) => ({ id, section, ensureVisible: true }),
  toolVisible: (tool: string) => ({ tool, ensureVisible: true }),
  useActive: () => ({ useActive: true }),
  viewKind: (kind: string) => ({ kind }),
  withPlacement: (args: Record<string, unknown>, placement: string | undefined) => ({
    ...args,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  workspacePath: (path: string) => ({ path }),
} as const;

export const XENESIS_NATURAL_VIEW_OPEN_PATH = 'xd.views.open';

export const XENESIS_NATURAL_CORE_TOOL_TARGET_SPECS = [
  {
    id: 'natural-tool-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    label: 'Capability Explorer',
    reasonName: 'Capability Explorer',
    words: ['capability', 'cr', 'registry', '레지스트리', '기능 탐색', 'capability explorer'],
  },
  {
    id: 'natural-tool-ai-workbench-open',
    path: 'xd.tools.core.aiWorkbench.open',
    label: 'AI Workbench',
    reasonName: 'AI Workbench',
    words: ['ai workbench', '워크벤치'],
  },
  {
    id: 'natural-tool-artifact-library-open',
    path: 'xd.tools.core.artifactLibrary.open',
    label: 'Artifact Library',
    reasonName: 'Artifact Library',
    words: ['artifact library', '아티팩트 라이브러리'],
  },
  {
    id: 'natural-tool-terminal-inspector-open',
    path: 'xd.tools.core.terminalInspector.open',
    label: 'Terminal Inspector',
    reasonName: 'Terminal Inspector',
    words: ['terminal inspector', '터미널 인스펙터'],
  },
  {
    id: 'natural-tool-process-viewer-open',
    path: 'xd.tools.core.processViewer.open',
    label: 'Process Viewer',
    reasonName: 'Process Viewer',
    words: ['process viewer', '프로세스 뷰어', '프로세스'],
  },
  {
    id: 'natural-tool-remote-sync-planner-open',
    path: 'xd.tools.core.remoteSyncPlanner.open',
    label: 'Remote Sync Planner',
    reasonName: 'Remote Sync Planner',
    words: ['remote sync', '원격 동기화'],
  },
  {
    id: 'natural-tool-run-task-panel-open',
    path: 'xd.tools.core.runTaskPanel.open',
    label: 'Run Task Panel',
    reasonName: 'Run Task Panel',
    words: ['run task', '작업 실행', '작업 패널'],
  },
  {
    id: 'natural-tool-safe-file-edit-center-open',
    path: 'xd.tools.core.safeFileEditCenter.open',
    label: 'Safe File Edit Center',
    reasonName: 'Safe File Edit Center',
    words: ['safe file', '안전 파일', '파일 편집 센터'],
  },
  {
    id: 'natural-tool-hermes-status-open',
    path: 'xd.tools.core.hermesStatus.open',
    label: 'Hermes Status',
    reasonName: 'Hermes Status',
    words: ['hermes status', '헤르메스 상태'],
  },
  {
    id: 'natural-tool-hermes-action-inbox-open',
    path: 'xd.tools.core.hermesActionInbox.open',
    label: 'Hermes Action Inbox',
    reasonName: 'Hermes Action Inbox',
    words: ['hermes action', '헤르메스 액션', 'action inbox', 'action-inbox', '액션 인박스', '액션인박스'],
  },
  {
    id: 'natural-tool-hermes-timeline-open',
    path: 'xd.tools.core.hermesTimeline.open',
    label: 'Hermes Timeline',
    reasonName: 'Hermes Timeline',
    words: ['hermes timeline', '헤르메스 타임라인'],
  },
  {
    id: 'natural-tool-network-monitor-open',
    path: 'xd.tools.core.networkMonitor.open',
    label: 'Network Monitor',
    reasonName: 'Network Monitor',
    words: ['network monitor', '네트워크 모니터'],
  },
  {
    id: 'natural-tool-audit-log-open',
    path: 'xd.tools.core.auditLog.open',
    label: 'Audit Log',
    reasonName: 'Audit Log',
    words: ['audit log', '감사 로그'],
  },
  {
    id: 'natural-tool-agent-performance-open',
    path: 'xd.tools.core.agentPerformance.open',
    label: 'Agent Performance',
    reasonName: 'Agent Performance',
    words: ['agent performance', '에이전트 성능'],
  },
  {
    id: 'natural-tool-xapp-preview-open',
    path: 'xd.tools.core.xappPreview.open',
    label: 'XApp Preview',
    reasonName: 'XApp Preview',
    words: ['xapp preview', 'xapp'],
  },
  {
    id: 'natural-tool-bot-open',
    path: 'xd.tools.core.bot.open',
    label: 'Bot',
    reasonName: 'Bot',
    words: ['bot', '봇'],
  },
] as const satisfies readonly XenesisNaturalCoreToolTarget[];

export const XENESIS_NATURAL_CORE_TOOL_TARGETS: readonly XenesisNaturalCoreToolTarget[] =
  XENESIS_NATURAL_CORE_TOOL_TARGET_SPECS;

export const XENESIS_NATURAL_VIEW_TARGET_SPECS = [
  {
    id: 'natural-gowoori-chat-open',
    label: 'GowooriChat',
    kind: 'gowooriChat',
    reason: 'Open GowooriChat from natural language request.',
    words: ['거울이 챗', '거울이챗', 'gowoorichat', 'gowoori chat', 'kouri chat', 'kourichat'],
  },
  {
    id: 'natural-gowoori-open',
    label: 'Gowoori',
    kind: 'gowoori',
    reason: 'Open Gowoori from natural language request.',
    words: ['거울이', 'gowoori', 'kouri'],
  },
  {
    id: 'natural-xenesis-agent-open',
    label: 'Xenesis Agent',
    kind: 'xenesisAgent',
    reason: 'Open Xenesis Agent from natural language request.',
    words: ['제니스', 'xenis', 'xenesis agent', 'xenesisagent'],
  },
  {
    id: 'natural-terminal-open',
    label: 'Terminal',
    kind: 'terminal',
    reason: 'Open terminal from natural language request.',
    words: ['터미널', 'terminal', 'shell', '콘솔'],
  },
  {
    id: 'natural-browser-open',
    label: 'Browser',
    kind: 'browser',
    reason: 'Open browser from natural language request.',
    words: ['브라우저', 'browser', '웹뷰', 'web'],
  },
] as const satisfies readonly XenesisNaturalViewTarget[];

export const XENESIS_NATURAL_VIEW_TARGETS: readonly XenesisNaturalViewTarget[] = XENESIS_NATURAL_VIEW_TARGET_SPECS;

export type XenesisNaturalSettingsCategoryTarget = XenesisNaturalWordsTarget & {
  category: SettingsCategoryId;
  action: XenesisNaturalDeskActionDescriptor;
};

function buildXenesisNaturalSettingsCategoryTarget(category: SettingsCategory): XenesisNaturalSettingsCategoryTarget {
  const id = `natural-settings-${category.id}-open`;
  return {
    id,
    category: category.id,
    label: category.id,
    words: category.naturalWords,
    action: {
      id,
      path: 'xd.panes.settings.open',
      reason: `Open the ${category.id} settings category from natural language request.`,
    },
  };
}

export const XENESIS_NATURAL_SETTINGS_CATEGORY_TARGET_SPECS: readonly XenesisNaturalSettingsCategoryTarget[] =
  VISIBLE_SETTINGS_CATEGORIES.map(buildXenesisNaturalSettingsCategoryTarget);

export const XENESIS_NATURAL_SETTINGS_CATEGORY_TARGETS: readonly XenesisNaturalSettingsCategoryTarget[] =
  XENESIS_NATURAL_SETTINGS_CATEGORY_TARGET_SPECS;

export function findXenesisNaturalSettingsCategoryTarget(value: string) {
  return (
    XENESIS_NATURAL_SETTINGS_CATEGORY_TARGETS.find((target) =>
      matchesXenesisNaturalContextRule(value, {
        contextWords: target.words,
        requiredContextWordGroups: [XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
      }),
    ) ?? null
  );
}

export type XenesisNaturalToolViewSectionTarget = {
  id: XenesisConnectionToolViewSectionId;
  label: string;
  words: readonly string[];
};

function xenesisNaturalViewSectionTarget<TId extends string>(section: {
  id: TId;
  label: string;
  naturalWords: readonly string[];
}): { id: TId; label: string; words: readonly string[] } {
  return {
    id: section.id,
    label: section.label,
    words: section.naturalWords,
  };
}

export const XENESIS_NATURAL_TOOL_VIEW_SECTION_TARGETS: readonly XenesisNaturalToolViewSectionTarget[] =
  XENESIS_CONNECTION_TOOL_VIEW_SECTION_DEFINITIONS.map(xenesisNaturalViewSectionTarget);

export function findXenesisNaturalToolViewSectionTarget(value: string): XenesisNaturalToolViewSectionTarget | null {
  return (
    XENESIS_NATURAL_TOOL_VIEW_SECTION_TARGETS.find(
      (target) =>
        (XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS as readonly string[]).includes(target.id) &&
        matchesXenesisNaturalContextRule(value, { contextWords: target.words }),
    ) ?? null
  );
}

export type XenesisNaturalMessengerViewSectionTarget = {
  id: XenesisConnectionMessengerViewSectionId;
  label: string;
  words: readonly string[];
};

export const XENESIS_NATURAL_MESSENGER_VIEW_SECTION_TARGETS: readonly XenesisNaturalMessengerViewSectionTarget[] =
  XENESIS_CONNECTION_MESSENGER_VIEW_SECTION_DEFINITIONS.map(xenesisNaturalViewSectionTarget);

export function findXenesisNaturalMessengerViewSectionTarget(
  value: string,
): XenesisNaturalMessengerViewSectionTarget | null {
  return (
    XENESIS_NATURAL_MESSENGER_VIEW_SECTION_TARGETS.find(
      (target) =>
        (XENESIS_CONNECTION_MESSENGER_VIEW_SECTION_IDS as readonly string[]).includes(target.id) &&
        matchesXenesisNaturalContextRule(value, { contextWords: target.words }),
    ) ?? null
  );
}

export type XenesisNaturalProviderViewSectionTarget = {
  id: XenesisConnectionProviderViewSectionId;
  label: string;
  words: readonly string[];
};

export const XENESIS_NATURAL_PROVIDER_VIEW_SECTION_TARGETS: readonly XenesisNaturalProviderViewSectionTarget[] =
  XENESIS_CONNECTION_PROVIDER_VIEW_SECTION_DEFINITIONS.map(xenesisNaturalViewSectionTarget);

export function findXenesisNaturalProviderViewSectionTarget(
  value: string,
): XenesisNaturalProviderViewSectionTarget | null {
  return (
    XENESIS_NATURAL_PROVIDER_VIEW_SECTION_TARGETS.find(
      (target) =>
        (XENESIS_CONNECTION_PROVIDER_VIEW_SECTION_IDS as readonly string[]).includes(target.id) &&
        matchesXenesisNaturalContextRule(value, { contextWords: target.words }),
    ) ?? null
  );
}

export type XenesisNaturalDeskActionRuleGroup =
  | 'paneOpen'
  | 'capture'
  | 'fileList'
  | 'filePath'
  | 'miscRead'
  | 'dockFocus'
  | 'dockClose'
  | 'dockSize'
  | 'windowSizePreset'
  | 'explorerSimple'
  | 'explorerFilter'
  | 'explorerNavigate'
  | 'terminalList'
  | 'terminalMany'
  | 'terminalRun'
  | 'dockWindowArrange'
  | 'dockPaneArrange'
  | 'dockGroupArrange'
  | 'dockWindowMerge'
  | 'dockPaneMerge'
  | 'dockGroupMerge'
  | 'dockPanesList'
  | 'artifactTarget';

export interface XenesisNaturalDeskActionRuleSpec {
  group: XenesisNaturalDeskActionRuleGroup;
  contextWords: readonly string[];
  requiredContextWordGroups?: readonly (readonly string[])[];
  blockedContextWords?: readonly string[];
  visibleText?: string;
}

export interface XenesisNaturalDeskActionSpec extends XenesisNaturalDeskActionDescriptor {
  rules?: readonly XenesisNaturalDeskActionRuleSpec[];
}

export const XENESIS_NATURAL_DESK_ACTION_SPECS = {
  settingsOpen: {
    id: 'natural-settings-open',
    path: 'xd.panes.settings.open',
    reason: 'Open settings from natural language request.',
    rules: [
      {
        group: 'paneOpen',
        contextWords: XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.settingsPaneOpen,
      },
    ],
  },
  diagnosticsOpen: {
    id: 'natural-diagnostics-open',
    path: 'xd.panes.diagnostics.open',
    reason: 'Open diagnostics from natural language request.',
    rules: [
      {
        group: 'paneOpen',
        contextWords: XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.diagnosticsPaneOpen,
      },
    ],
  },
  capabilityExplorerOpen: {
    id: 'natural-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    reason: 'Open Capability Explorer from natural language request.',
    rules: [
      {
        group: 'paneOpen',
        contextWords: XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.capabilityExplorerOpen,
      },
    ],
  },
  captureList: {
    id: 'natural-capture-list',
    path: 'xd.capture.list',
    reason: 'List captures from natural language request.',
    rules: [
      {
        group: 'capture',
        contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.captureListRead,
      },
    ],
  },
  captureActivePane: {
    id: 'natural-capture-active-pane',
    path: 'xd.capture.activePane',
    reason: 'Capture the active pane from natural language request.',
    rules: [
      {
        group: 'capture',
        contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activePaneCapture,
      },
    ],
  },
  dockFocusActive: {
    id: 'natural-dock-focus-active',
    path: 'xd.dock.focus',
    reason: 'Focus the active dock content from natural language request.',
    rules: [
      {
        group: 'dockFocus',
        contextWords: XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockFocus,
      },
    ],
  },
  dockCloseRight: {
    id: 'natural-dock-close-right-active',
    path: 'xd.dock.closeRight',
    reason: 'Close tabs to the right of active dock content from natural language request.',
    rules: [
      {
        group: 'dockClose',
        contextWords: XENESIS_NATURAL_RIGHT_SCOPE_WORDS,
        requiredContextWordGroups: [
          XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
          XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
        ],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
      },
    ],
  },
  dockCloseOthers: {
    id: 'natural-dock-close-others-active',
    path: 'xd.dock.closeOthers',
    reason: 'Close other tabs around active dock content from natural language request.',
    rules: [
      {
        group: 'dockClose',
        contextWords: XENESIS_NATURAL_OTHER_SCOPE_WORDS,
        requiredContextWordGroups: [
          XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
          XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
        ],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
      },
    ],
  },
  dockCloseAll: {
    id: 'natural-dock-close-all-active',
    path: 'xd.dock.closeAll',
    reason: 'Close all tabs in active dock pane from natural language request.',
    rules: [
      {
        group: 'dockClose',
        contextWords: XENESIS_NATURAL_ALL_SCOPE_WORDS,
        requiredContextWordGroups: [
          XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
          XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
        ],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
      },
    ],
  },
  dockCloseActive: {
    id: 'natural-dock-close-active',
    path: 'xd.dock.close',
    reason: 'Close the active dock content from natural language request.',
    rules: [
      {
        group: 'dockClose',
        contextWords: XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
      },
    ],
  },
  dockSizeSet: {
    id: 'natural-dock-size-set',
    path: 'xd.dock.sizes.set',
    reason: 'Resize a dock side from natural language request.',
    rules: [
      {
        group: 'dockSize',
        contextWords: XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_RESIZE_COMMAND_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockAreaResize,
      },
    ],
  },
  windowSizePreset: {
    id: 'natural-window-size-preset',
    path: 'xd.window.sizer.applyPreset',
    reason: 'Apply window size preset from natural language request.',
    rules: [
      {
        group: 'windowSizePreset',
        contextWords: [],
      },
    ],
  },
  filesListOpen: {
    id: 'natural-files-list-open',
    path: 'xd.files.listOpen',
    reason: 'List open files from natural language request.',
    rules: [
      {
        group: 'fileList',
        contextWords: XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.filesListRead,
      },
    ],
  },
  fileOpen: {
    id: 'natural-file-open',
    path: 'xd.files.open',
    reason: 'Open file from natural language request.',
    rules: [
      {
        group: 'filePath',
        contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_OPEN_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileOpen,
      },
    ],
  },
  fileRead: {
    id: 'natural-file-read',
    path: 'xd.files.read',
    reason: 'Read file from natural language request.',
    rules: [
      {
        group: 'filePath',
        contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileContentRead,
      },
    ],
  },
  explorerHide: {
    id: 'natural-explorer-hide',
    path: 'xd.explorer.local.hide',
    reason: 'Hide explorer from natural language request.',
    rules: [
      {
        group: 'explorerSimple',
        contextWords: XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerHide,
      },
    ],
  },
  explorerToggle: {
    id: 'natural-explorer-toggle',
    path: 'xd.explorer.local.toggle',
    reason: 'Toggle explorer from natural language request.',
    rules: [
      {
        group: 'explorerSimple',
        contextWords: XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerToggle,
      },
    ],
  },
  explorerRefresh: {
    id: 'natural-explorer-refresh',
    path: 'xd.explorer.local.refresh',
    reason: 'Refresh explorer from natural language request.',
    rules: [
      {
        group: 'explorerSimple',
        contextWords: XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerRefresh,
      },
    ],
  },
  explorerGoUp: {
    id: 'natural-explorer-go-up',
    path: 'xd.explorer.local.goUp',
    reason: 'Go to parent folder from natural language request.',
    rules: [
      {
        group: 'explorerSimple',
        contextWords: XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerGoUp,
      },
    ],
  },
  explorerFilter: {
    id: 'natural-explorer-filter',
    path: 'xd.explorer.local.setFilter',
    reason: 'Filter explorer from natural language request.',
    rules: [
      {
        group: 'explorerFilter',
        contextWords: XENESIS_NATURAL_FILTER_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerFilterApply,
      },
    ],
  },
  explorerNavigate: {
    id: 'natural-explorer-navigate',
    path: 'xd.explorer.local.navigate',
    reason: 'Navigate explorer from natural language request.',
    rules: [
      {
        group: 'explorerNavigate',
        contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerNavigate,
      },
    ],
  },
  explorerShow: {
    id: 'natural-explorer-show',
    path: 'xd.explorer.local.show',
    reason: 'Show explorer from natural language request.',
    rules: [
      {
        group: 'explorerSimple',
        contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerShow,
      },
    ],
  },
  favoritesShow: {
    id: 'natural-favorites-show',
    path: 'xd.favorites.showTab',
    reason: 'Show favorites from natural language request.',
    rules: [
      {
        group: 'miscRead',
        contextWords: XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.favoritesShow,
      },
    ],
  },
  terminalsList: {
    id: 'natural-terminals-list',
    path: 'xd.terminals.list',
    reason: 'List terminals from natural language request.',
    rules: [
      {
        group: 'terminalList',
        contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalListRead,
      },
    ],
  },
  terminalRunMany: {
    id: 'natural-terminal-run-many',
    path: 'xd.terminals.runMany',
    reason: 'Open multiple terminals from natural language request.',
    rules: [
      {
        group: 'terminalMany',
        contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.multipleTerminalsOpenAndArrange,
      },
    ],
  },
  terminalRun: {
    id: 'natural-terminal-run',
    path: 'xd.terminals.run',
    reason: 'Run terminal command from natural language request.',
    rules: [
      {
        group: 'terminalRun',
        contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalCommandRun,
      },
    ],
  },
  dockWindowArrange: {
    id: 'natural-dock-window-arrange',
    path: 'xd.dock.window.arrange',
    reason: 'Arrange a Desk window area from natural language request.',
    rules: [
      {
        group: 'dockWindowArrange',
        contextWords: XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDeskAreaArrange,
      },
    ],
  },
  dockPaneArrange: {
    id: 'natural-dock-pane-arrange',
    path: 'xd.dock.pane.arrange',
    reason: 'Arrange the active dock pane from natural language request.',
    rules: [
      {
        group: 'dockPaneArrange',
        contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneArrange,
      },
    ],
  },
  dockArrangeGrid: {
    id: 'natural-dock-arrange-grid',
    path: 'xd.dock.arrangeGrid',
    reason: 'Arrange dock group as grid from natural language request.',
    rules: [
      {
        group: 'dockGroupArrange',
        contextWords: XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupTile,
      },
    ],
  },
  dockArrangeHorizontal: {
    id: 'natural-dock-arrange-horizontal',
    path: 'xd.dock.arrangeHorizontal',
    reason: 'Arrange dock group horizontally from natural language request.',
    rules: [
      {
        group: 'dockGroupArrange',
        contextWords: XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupHorizontal,
      },
    ],
  },
  dockArrangeVertical: {
    id: 'natural-dock-arrange-vertical',
    path: 'xd.dock.arrangeVertical',
    reason: 'Arrange dock group vertically from natural language request.',
    rules: [
      {
        group: 'dockGroupArrange',
        contextWords: XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupVertical,
      },
    ],
  },
  dockWindowMerge: {
    id: 'natural-dock-window-merge',
    path: 'xd.dock.window.merge',
    reason: 'Merge a Desk window area from natural language request.',
    rules: [
      {
        group: 'dockWindowMerge',
        contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDockMerge,
      },
    ],
  },
  dockPaneMerge: {
    id: 'natural-dock-pane-merge',
    path: 'xd.dock.pane.merge',
    reason: 'Merge the active dock pane from natural language request.',
    rules: [
      {
        group: 'dockPaneMerge',
        contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneMerge,
      },
    ],
  },
  dockMergeAll: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeAll',
    reason: 'Merge dock layout from natural language request.',
    rules: [
      {
        group: 'dockGroupMerge',
        contextWords: XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
      },
    ],
  },
  dockMergeGroup: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeGroup',
    reason: 'Merge dock layout from natural language request.',
    rules: [
      {
        group: 'dockGroupMerge',
        contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
      },
    ],
  },
  dockPanesList: {
    id: 'natural-dock-panes-list',
    path: 'xd.dock.panes.list',
    reason: 'List dock panes from natural language request.',
    rules: [
      {
        group: 'dockPanesList',
        contextWords: XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockPanesListRead,
      },
    ],
  },
  artifactTargetSet: {
    id: 'natural-artifact-target-set',
    path: 'xd.dock.artifactTarget.set',
    reason: 'Set active pane as artifact target from natural language request.',
    rules: [
      {
        group: 'artifactTarget',
        contextWords: XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS,
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.artifactTargetSet,
      },
    ],
  },
  appStatus: {
    id: 'natural-app-status',
    path: 'xd.app.status',
    reason: 'Read app status from natural language request.',
    rules: [
      {
        group: 'miscRead',
        contextWords: XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_APP_STATUS_TARGET_WORDS],
        visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.appStatusRead,
      },
    ],
  },
} as const satisfies Record<string, XenesisNaturalDeskActionSpec>;

export const buildXenesisNaturalDeskActionDescriptors = <TSpecs extends Record<string, XenesisNaturalDeskActionSpec>>(
  specs: TSpecs,
) =>
  Object.fromEntries(
    Object.entries(specs).map(([key, spec]) => [
      key,
      {
        id: spec.id,
        path: spec.path,
        reason: spec.reason,
      },
    ]),
  ) as { readonly [K in keyof TSpecs]: XenesisNaturalDeskActionDescriptor };

export const buildXenesisNaturalDeskActionRules = <TSpecs extends Record<string, XenesisNaturalDeskActionSpec>>(
  specs: TSpecs,
  group: XenesisNaturalDeskActionRuleGroup,
) =>
  Object.values(specs).flatMap((spec) =>
    (spec.rules ?? [])
      .filter((rule) => rule.group === group)
      .map(
        (rule) =>
          ({
            contextWords: rule.contextWords,
            ...(rule.requiredContextWordGroups ? { requiredContextWordGroups: rule.requiredContextWordGroups } : {}),
            ...(rule.blockedContextWords ? { blockedContextWords: rule.blockedContextWords } : {}),
            action: {
              id: spec.id,
              path: spec.path,
              reason: spec.reason,
            },
            ...(rule.visibleText ? { visibleText: rule.visibleText } : {}),
          }) satisfies XenesisNaturalCatalogActionRule,
      ),
  ) as readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS = buildXenesisNaturalDeskActionDescriptors(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
);

export const XENESIS_NATURAL_DESK_PANE_OPEN_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'paneOpen',
);

export const XENESIS_NATURAL_DESK_CAPTURE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'capture',
);

export const XENESIS_NATURAL_DESK_FILE_LIST_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'fileList',
);

export const XENESIS_NATURAL_DESK_FILE_PATH_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'filePath',
);

export const XENESIS_NATURAL_DESK_MISC_READ_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'miscRead',
);

export const XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockFocus',
);

export const XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockClose',
);

export const XENESIS_NATURAL_DOCK_SIZE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockSize',
);

export const XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'windowSizePreset',
);

export const XENESIS_NATURAL_EXPLORER_SIMPLE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'explorerSimple',
);

export const XENESIS_NATURAL_EXPLORER_FILTER_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'explorerFilter',
);

export const XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'explorerNavigate',
);

export const XENESIS_NATURAL_TERMINAL_LIST_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'terminalList',
);

export const XENESIS_NATURAL_TERMINAL_MANY_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'terminalMany',
);

export const XENESIS_NATURAL_TERMINAL_RUN_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'terminalRun',
);

export const XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockWindowArrange',
);

export const XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockPaneArrange',
);

export const XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockGroupArrange',
);

export const XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockWindowMerge',
);

export const XENESIS_NATURAL_DOCK_PANE_MERGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockPaneMerge',
);

export const XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockGroupMerge',
);

export const XENESIS_NATURAL_DOCK_PANES_LIST_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'dockPanesList',
);

export const XENESIS_NATURAL_ARTIFACT_TARGET_RULES = buildXenesisNaturalDeskActionRules(
  XENESIS_NATURAL_DESK_ACTION_SPECS,
  'artifactTarget',
);

export type XenesisNaturalRuntimeActionRuleGroup =
  | 'agentReadback'
  | 'agentSubmit'
  | 'runStart'
  | 'workspaceSet'
  | 'runtimeSupport'
  | 'gateway'
  | 'runtimeInventory'
  | 'profileInventory'
  | 'runtimeControl';

export interface XenesisNaturalRuntimeActionRuleSpec {
  group: XenesisNaturalRuntimeActionRuleGroup;
  contextWords: readonly string[];
  requiredContextWordGroups?: readonly (readonly string[])[];
  blockedContextWords?: readonly string[];
}

export interface XenesisNaturalRuntimeActionSpec extends XenesisNaturalDeskActionDescriptor {
  rules?: readonly XenesisNaturalRuntimeActionRuleSpec[];
}

export const XENESIS_NATURAL_RUNTIME_ACTION_SPECS = {
  localCliScan: {
    id: 'natural-local-cli-scan',
    path: 'xd.localCli.scan',
    reason: 'Scan local CLI agents from natural language request.',
    rules: [
      {
        group: 'runtimeSupport',
        contextWords: XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS],
      },
    ],
  },
  mcpBridgeStatus: {
    id: 'natural-mcp-bridge-status',
    path: 'xd.mcp.bridge.status',
    reason: 'Read MCP bridge status from natural language request.',
    rules: [
      {
        group: 'runtimeSupport',
        contextWords: XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
      },
    ],
  },
  mcpSettingsStatus: {
    id: 'natural-mcp-settings-status',
    path: 'xd.mcp.settings.status',
    reason: 'Read MCP settings status from natural language request.',
    rules: [
      {
        group: 'runtimeSupport',
        contextWords: XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
      },
    ],
  },
  actionInboxList: {
    id: 'natural-mcp-action-inbox-list',
    path: 'xd.mcp.actionInbox.list',
    reason: 'List Action Inbox items from natural language request.',
    rules: [
      {
        group: 'runtimeSupport',
        contextWords: XENESIS_NATURAL_ACTION_INBOX_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
      },
    ],
  },
  gatewayRestart: {
    id: 'natural-xenesis-gateway-restart',
    path: 'xd.xenesis.gateway.restart',
    reason: 'Restart Xenesis gateway from natural language request.',
    rules: [
      {
        group: 'gateway',
        contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GATEWAY_RESTART_CONTEXT_WORDS],
      },
    ],
  },
  gatewayStart: {
    id: 'natural-xenesis-gateway-start',
    path: 'xd.xenesis.gateway.start',
    reason: 'Start Xenesis gateway from natural language request.',
    rules: [
      {
        group: 'gateway',
        contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GATEWAY_START_CONTEXT_WORDS],
        blockedContextWords: XENESIS_NATURAL_GATEWAY_RESTART_CONTEXT_WORDS,
      },
    ],
  },
  gatewayStop: {
    id: 'natural-xenesis-gateway-stop',
    path: 'xd.xenesis.gateway.stop',
    reason: 'Stop Xenesis gateway from natural language request.',
    rules: [
      {
        group: 'gateway',
        contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_GATEWAY_STOP_CONTEXT_WORDS],
      },
    ],
  },
  gatewayDashboardOpen: {
    id: 'natural-xenesis-gateway-dashboard-open',
    path: 'xd.xenesis.gateway.openDashboard',
    reason: 'Open Xenesis gateway dashboard from natural language request.',
    rules: [
      {
        group: 'gateway',
        contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
      },
    ],
  },
  gatewayStatus: {
    id: 'natural-xenesis-gateway-status',
    path: 'xd.xenesis.gateway.status',
    reason: 'Read Xenesis gateway status from natural language request.',
    rules: [
      {
        group: 'gateway',
        contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
      },
    ],
  },
  agentEvents: {
    id: 'natural-xenesis-agent-events',
    path: 'xd.xenesis.agents.events',
    reason: 'List Xenesis Agent pane events from natural language request.',
    rules: [
      {
        group: 'agentReadback',
        contextWords: XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
      },
    ],
  },
  agentStatus: {
    id: 'natural-xenesis-agent-status',
    path: 'xd.xenesis.agents.status',
    reason: 'Read Xenesis Agent pane status from natural language request.',
    rules: [
      {
        group: 'agentReadback',
        contextWords: XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
      },
    ],
  },
  runtimeStatus: {
    id: 'natural-xenesis-status',
    path: 'xd.xenesis.status',
    reason: 'Read Xenesis runtime status from natural language request.',
    rules: [
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
        blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
      },
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
        blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
      },
    ],
  },
  reportsList: {
    id: 'natural-xenesis-reports-list',
    path: 'xd.xenesis.reports.list',
    reason: 'List Xenesis reports from natural language request.',
    rules: [
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
      },
    ],
  },
  tasksList: {
    id: 'natural-xenesis-tasks-list',
    path: 'xd.xenesis.tasks.list',
    reason: 'List Xenesis tasks from natural language request.',
    rules: [
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_TASK_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
      },
    ],
  },
  agentsList: {
    id: 'natural-xenesis-agents-list',
    path: 'xd.xenesis.agents.list',
    reason: 'List registered Xenesis Agent panes from natural language request.',
    rules: [
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
      },
    ],
  },
  diagnostics: {
    id: 'natural-xenesis-diagnostics',
    path: 'xd.xenesis.diagnostics',
    reason: 'Read Xenesis operational diagnostics from natural language request.',
    rules: [
      {
        group: 'runtimeInventory',
        contextWords: XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
      },
    ],
  },
  profilesList: {
    id: 'natural-xenesis-profiles-list',
    path: 'xd.xenesis.profiles.list',
    reason: 'List Xenesis profiles from natural language request.',
    rules: [
      {
        group: 'profileInventory',
        contextWords: XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_PROFILE_CONTEXT_WORDS],
      },
    ],
  },
  agentSubmit: {
    id: 'natural-xenesis-agent-submit',
    path: 'xd.xenesis.agents.submit',
    reason: 'Submit Xenesis Agent pane message from natural language request.',
    rules: [
      {
        group: 'agentSubmit',
        contextWords: XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
      },
    ],
  },
  runsStart: {
    id: 'natural-xenesis-runs-start',
    path: 'xd.xenesis.runs.start',
    reason: 'Start Xenesis run from natural language request.',
    rules: [
      {
        group: 'runStart',
        contextWords: XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUN_CONTEXT_WORDS],
        blockedContextWords: XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
      },
    ],
  },
  runsCancel: {
    id: 'natural-xenesis-runs-cancel',
    path: 'xd.xenesis.runs.cancel',
    reason: 'Cancel active Xenesis run from natural language request.',
    rules: [
      {
        group: 'runtimeControl',
        contextWords: XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS],
      },
    ],
  },
  sessionsReset: {
    id: 'natural-xenesis-sessions-reset',
    path: 'xd.xenesis.sessions.reset',
    reason: 'Reset active Xenesis session from natural language request.',
    rules: [
      {
        group: 'runtimeControl',
        contextWords: XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS],
      },
    ],
  },
  workspaceSet: {
    id: 'natural-xenesis-workspace-set',
    path: 'xd.xenesis.workspace.set',
    reason: 'Set Xenesis workspace from natural language request.',
    rules: [
      {
        group: 'workspaceSet',
        contextWords: XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS],
      },
    ],
  },
} as const satisfies Record<string, XenesisNaturalRuntimeActionSpec>;

function buildXenesisNaturalRuntimeActionDescriptors<TSpecs extends Record<string, XenesisNaturalRuntimeActionSpec>>(
  specs: TSpecs,
): { [K in keyof TSpecs]: XenesisNaturalDeskActionDescriptor } {
  return Object.fromEntries(
    Object.entries(specs).map(([key, spec]) => [
      key,
      {
        id: spec.id,
        path: spec.path,
        reason: spec.reason,
      },
    ]),
  ) as { [K in keyof TSpecs]: XenesisNaturalDeskActionDescriptor };
}

function buildXenesisNaturalRuntimeRules<TSpecs extends Record<string, XenesisNaturalRuntimeActionSpec>>(
  specs: TSpecs,
  group: XenesisNaturalRuntimeActionRuleGroup,
): XenesisNaturalCatalogActionRule[] {
  return Object.values(specs).flatMap((spec) =>
    (spec.rules ?? [])
      .filter((rule) => rule.group === group)
      .map((rule) => ({
        contextWords: rule.contextWords,
        ...(rule.requiredContextWordGroups ? { requiredContextWordGroups: rule.requiredContextWordGroups } : {}),
        ...(rule.blockedContextWords ? { blockedContextWords: rule.blockedContextWords } : {}),
        action: {
          id: spec.id,
          path: spec.path,
          reason: spec.reason,
        },
      })),
  );
}

export const XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS = buildXenesisNaturalRuntimeActionDescriptors(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
);

export const XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS = {
  actionInboxList: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.actionInboxList.path,
} as const;

export const XENESIS_NATURAL_GATEWAY_LIFECYCLE_PLAN_PATHS = [
  XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayStart.path,
  XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayStop.path,
  XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayRestart.path,
] as const;

export const XENESIS_NATURAL_AGENT_READBACK_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'agentReadback',
);

export const XENESIS_NATURAL_AGENT_SUBMIT_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'agentSubmit',
);

export const XENESIS_NATURAL_RUN_START_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'runStart',
);

export const XENESIS_NATURAL_WORKSPACE_SET_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'workspaceSet',
);

export const XENESIS_NATURAL_RUNTIME_SUPPORT_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'runtimeSupport',
);

export const XENESIS_NATURAL_GATEWAY_ACTION_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'gateway',
);

export const XENESIS_NATURAL_RUNTIME_INVENTORY_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'runtimeInventory',
);

export const XENESIS_NATURAL_PROFILE_INVENTORY_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'profileInventory',
);

export const XENESIS_NATURAL_RUNTIME_CONTROL_RULES = buildXenesisNaturalRuntimeRules(
  XENESIS_NATURAL_RUNTIME_ACTION_SPECS,
  'runtimeControl',
);

export type XenesisNaturalGuideActionRuleGroup = 'open' | 'status';
export interface XenesisNaturalGuideActionRuleSpec {
  group: XenesisNaturalGuideActionRuleGroup;
  contextWords: readonly string[];
}

type XenesisNaturalGuideActionSpecMap = {
  open: XenesisNaturalDeskActionTemplateDescriptor<[string, string, boolean]> & {
    rules: readonly XenesisNaturalGuideActionRuleSpec[];
  };
  status: XenesisNaturalDeskActionTemplateDescriptor<[string, string]> & {
    rules: readonly XenesisNaturalGuideActionRuleSpec[];
  };
};

export const XENESIS_NATURAL_GUIDE_ACTION_SPECS = {
  open: {
    path: 'xd.xenesis.guides.open',
    idFor: (id: string, _label: string, _openFile: boolean) => `natural-xenesis-guide-open-${id}`,
    reasonFor: (_id: string, label: string, openFile: boolean) =>
      `Open ${label} guide${openFile ? ' file' : ''} from natural language request.`,
    rules: [
      {
        group: 'open',
        contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
      },
    ],
  },
  status: {
    path: 'xd.xenesis.guides.status',
    idFor: (id: string, _label: string) => `natural-xenesis-guide-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} guide catalog status from natural language request.`,
    rules: [
      {
        group: 'status',
        contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
      },
    ],
  },
} as const satisfies XenesisNaturalGuideActionSpecMap;

export type XenesisNaturalOnboardingActionRuleGroup = 'open' | 'status';
export interface XenesisNaturalOnboardingActionRuleSpec {
  group: XenesisNaturalOnboardingActionRuleGroup;
  contextWords: readonly string[];
  argsKind: XenesisNaturalOnboardingActionRule['argsKind'];
  targetRequired: boolean;
}

type XenesisNaturalOnboardingActionSpecMap = {
  stepOpen: XenesisNaturalDeskActionTemplateDescriptor<[string, string]> & {
    rules: readonly XenesisNaturalOnboardingActionRuleSpec[];
  };
  centerOpen: XenesisNaturalDeskActionDescriptor & {
    rules: readonly XenesisNaturalOnboardingActionRuleSpec[];
  };
  stepStatus: XenesisNaturalDeskActionTemplateDescriptor<[string, string]> & {
    rules: readonly XenesisNaturalOnboardingActionRuleSpec[];
  };
};

export const XENESIS_NATURAL_ONBOARDING_ACTION_SPECS = {
  stepOpen: {
    path: 'xd.xenesis.onboarding.open',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} onboarding checklist step from natural language request.`,
    rules: [
      {
        group: 'open',
        contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
        argsKind: 'targetIdVisible',
        targetRequired: true,
      },
    ],
  },
  centerOpen: {
    id: 'natural-xenesis-onboarding-center-open',
    path: 'xd.xenesis.onboarding.open',
    reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    rules: [
      {
        group: 'open',
        contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
        argsKind: 'ensureVisible',
        targetRequired: false,
      },
    ],
  },
  stepStatus: {
    path: 'xd.xenesis.onboarding.status',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} onboarding checklist status from natural language request.`,
    rules: [
      {
        group: 'status',
        contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
        argsKind: 'targetId',
        targetRequired: true,
      },
    ],
  },
} as const satisfies XenesisNaturalOnboardingActionSpecMap;

const buildXenesisNaturalGuideActionDescriptors = (specs: XenesisNaturalGuideActionSpecMap) =>
  Object.fromEntries(
    Object.entries(specs).map(([key, spec]) => [
      key,
      {
        path: spec.path,
        idFor: spec.idFor,
        reasonFor: spec.reasonFor,
      },
    ]),
  ) as {
    readonly open: XenesisNaturalDeskActionTemplateDescriptor<[string, string, boolean]>;
    readonly status: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  };

const buildXenesisNaturalOnboardingActionDescriptors = (specs: XenesisNaturalOnboardingActionSpecMap) =>
  ({
    stepOpen: {
      path: specs.stepOpen.path,
      idFor: specs.stepOpen.idFor,
      reasonFor: specs.stepOpen.reasonFor,
    },
    centerOpen: {
      id: specs.centerOpen.id,
      path: specs.centerOpen.path,
      reason: specs.centerOpen.reason,
    },
    stepStatus: {
      path: specs.stepStatus.path,
      idFor: specs.stepStatus.idFor,
      reasonFor: specs.stepStatus.reasonFor,
    },
  }) as const satisfies {
    readonly stepOpen: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
    readonly centerOpen: XenesisNaturalDeskActionDescriptor;
    readonly stepStatus: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  };

export const XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS = buildXenesisNaturalGuideActionDescriptors(
  XENESIS_NATURAL_GUIDE_ACTION_SPECS,
);

export const XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS = buildXenesisNaturalOnboardingActionDescriptors(
  XENESIS_NATURAL_ONBOARDING_ACTION_SPECS,
);

const buildXenesisNaturalGuideActionRules = (
  specs: XenesisNaturalGuideActionSpecMap,
  group: XenesisNaturalGuideActionRuleGroup,
) =>
  Object.entries(specs).flatMap(([key, spec]) =>
    spec.rules
      .filter((rule) => rule.group === group)
      .map((rule) => ({
        contextWords: rule.contextWords,
        action: XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS[key as keyof typeof XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS],
      })),
  );

const buildXenesisNaturalOnboardingActionRules = (
  specs: XenesisNaturalOnboardingActionSpecMap,
  group: XenesisNaturalOnboardingActionRuleGroup,
) =>
  Object.entries(specs).flatMap(([key, spec]) =>
    spec.rules
      .filter((rule) => rule.group === group)
      .map((rule) => ({
        contextWords: rule.contextWords,
        action:
          XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS[
            key as keyof typeof XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS
          ],
        argsKind: rule.argsKind,
        targetRequired: rule.targetRequired,
      })),
  );

export const XENESIS_NATURAL_GUIDE_OPEN_RULES = buildXenesisNaturalGuideActionRules(
  XENESIS_NATURAL_GUIDE_ACTION_SPECS,
  'open',
) as readonly XenesisNaturalGuideOpenRule[];

export const XENESIS_NATURAL_GUIDE_STATUS_RULES = buildXenesisNaturalGuideActionRules(
  XENESIS_NATURAL_GUIDE_ACTION_SPECS,
  'status',
) as readonly XenesisNaturalGuideStatusRule[];

export const XENESIS_NATURAL_ONBOARDING_OPEN_RULES = buildXenesisNaturalOnboardingActionRules(
  XENESIS_NATURAL_ONBOARDING_ACTION_SPECS,
  'open',
) as readonly XenesisNaturalOnboardingActionRule[];

export const XENESIS_NATURAL_ONBOARDING_STATUS_RULES = buildXenesisNaturalOnboardingActionRules(
  XENESIS_NATURAL_ONBOARDING_ACTION_SPECS,
  'status',
) as readonly XenesisNaturalOnboardingActionRule[];

type XenesisNaturalAggregateMode = 'open' | 'status';
interface XenesisNaturalAggregateCatalogRuleSpec extends Omit<XenesisNaturalCatalogActionRule, 'action'> {
  order?: number;
}
interface XenesisNaturalConnectionAggregateOpenRuleSpec
  extends Omit<XenesisNaturalConnectionAggregateOpenRule, 'action'> {
  order?: number;
}
interface XenesisNaturalConnectionAggregateStatusRuleSpec
  extends Omit<XenesisNaturalConnectionAggregateStatusRule, 'action'> {
  order?: number;
}

interface XenesisNaturalAggregateSurfaceActionSpec extends XenesisNaturalDeskActionDescriptor {
  catalogRules?: readonly XenesisNaturalAggregateCatalogRuleSpec[];
  connectionOpenRules?: readonly XenesisNaturalConnectionAggregateOpenRuleSpec[];
  connectionStatusRules?: readonly XenesisNaturalConnectionAggregateStatusRuleSpec[];
}

interface XenesisNaturalAggregateSurfaceSpec {
  key: string;
  open?: XenesisNaturalAggregateSurfaceActionSpec;
  status?: XenesisNaturalAggregateSurfaceActionSpec;
}

function buildXenesisNaturalAggregateActionDescriptors(
  specs: readonly XenesisNaturalAggregateSurfaceSpec[],
  mode: XenesisNaturalAggregateMode,
): Record<string, XenesisNaturalDeskActionDescriptor> {
  return Object.fromEntries(
    specs.flatMap((spec) => {
      const action = spec[mode];
      return action ? [[spec.key, { id: action.id, path: action.path, reason: action.reason }]] : [];
    }),
  );
}

function buildXenesisNaturalAggregateRules(
  specs: readonly XenesisNaturalAggregateSurfaceSpec[],
  mode: XenesisNaturalAggregateMode,
): XenesisNaturalCatalogActionRule[] {
  const descriptors = buildXenesisNaturalAggregateActionDescriptors(specs, mode);
  return specs
    .flatMap((spec, specIndex) => {
      const action = spec[mode];
      const descriptor = descriptors[spec.key];
      if (!action || !descriptor) return [];
      return (action.catalogRules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => ({
      contextWords: rule.contextWords,
      ...(rule.requiredContextWordGroups ? { requiredContextWordGroups: rule.requiredContextWordGroups } : {}),
      ...(rule.blockedContextWords ? { blockedContextWords: rule.blockedContextWords } : {}),
      ...(rule.fallback ? { fallback: true } : {}),
      ...(rule.visibleText ? { visibleText: rule.visibleText } : {}),
      action: descriptor,
    }));
}

function buildXenesisNaturalConnectionAggregateOpenRules(
  specs: readonly XenesisNaturalAggregateSurfaceSpec[],
): XenesisNaturalConnectionAggregateOpenRule[] {
  const descriptors = buildXenesisNaturalAggregateActionDescriptors(specs, 'open');
  return specs
    .flatMap((spec, specIndex) => {
      const descriptor = descriptors[spec.key];
      if (!descriptor) return [];
      return (spec.open?.connectionOpenRules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => ({ stage: rule.stage, matchKind: rule.matchKind, action: descriptor }));
}

function buildXenesisNaturalConnectionAggregateStatusRules(
  specs: readonly XenesisNaturalAggregateSurfaceSpec[],
): XenesisNaturalConnectionAggregateStatusRule[] {
  const descriptors = buildXenesisNaturalAggregateActionDescriptors(specs, 'status');
  return specs
    .flatMap((spec, specIndex) => {
      const descriptor = descriptors[spec.key];
      if (!descriptor) return [];
      return (spec.status?.connectionStatusRules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => ({ stage: rule.stage, matchKind: rule.matchKind, action: descriptor }));
}

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_SURFACE_SPECS = [
  {
    key: 'guides',
    open: {
      id: 'natural-xenesis-guides-catalog-open',
      path: 'xd.xenesis.guides.open',
      reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
      connectionOpenRules: [{ stage: 'guide', matchKind: 'guideCatalog', order: 0 }],
    },
    status: {
      id: 'natural-xenesis-guides-status',
      path: 'xd.xenesis.guides.status',
      reason: 'Read Xenesis guide catalog status from natural language request.',
      connectionStatusRules: [
        { stage: 'early', matchKind: 'guideCatalog', order: 0 },
        { stage: 'late', matchKind: 'guideContext', order: 4 },
      ],
    },
  },
  {
    key: 'diagnostics',
    open: {
      id: 'natural-xenesis-connection-diagnostics-catalog-open',
      path: 'xd.xenesis.connections.diagnostics.open',
      reason: 'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
      connectionOpenRules: [{ stage: 'late', matchKind: 'diagnosticsCatalog', order: 1 }],
    },
    status: {
      id: 'natural-xenesis-connection-diagnostics-status',
      path: 'xd.xenesis.connections.diagnostics.status',
      reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
      connectionStatusRules: [{ stage: 'early', matchKind: 'diagnosticsCatalog', order: 1 }],
    },
  },
  {
    key: 'setupRequests',
    open: {
      id: 'natural-xenesis-connection-setup-requests-catalog-open',
      path: 'xd.xenesis.connections.setupRequests.open',
      reason: 'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
      connectionOpenRules: [{ stage: 'late', matchKind: 'setupRequestCatalog', order: 2 }],
    },
    status: {
      id: 'natural-xenesis-connection-setup-requests-status',
      path: 'xd.xenesis.connections.setupRequests.status',
      reason: 'Read Xenesis connection setup request catalog from natural language request.',
      connectionStatusRules: [{ stage: 'early', matchKind: 'setupRequestCatalog', order: 2 }],
    },
  },
  {
    key: 'onboarding',
    status: {
      id: 'natural-xenesis-onboarding-status',
      path: 'xd.xenesis.onboarding.status',
      reason: 'Read Xenesis onboarding status from natural language request.',
      connectionStatusRules: [{ stage: 'late', matchKind: 'onboarding', order: 3 }],
    },
  },
  {
    key: 'connections',
    open: {
      id: 'natural-xenesis-connections-center-open',
      path: 'xd.xenesis.connections.open',
      reason: 'Open Xenesis Connection Center from natural language request.',
      connectionOpenRules: [{ stage: 'late', matchKind: 'connectionCenterOpen', order: 3 }],
    },
    status: {
      id: 'natural-xenesis-connections-status',
      path: 'xd.xenesis.connections.status',
      reason: 'Read Xenesis connection status from natural language request.',
      connectionStatusRules: [{ stage: 'late', matchKind: 'connectionContext', order: 5 }],
    },
  },
] as const satisfies readonly XenesisNaturalAggregateSurfaceSpec[];

export const XENESIS_NATURAL_TOOL_AGGREGATE_SURFACE_SPECS = [
  {
    key: 'connectors',
    open: {
      id: 'natural-xenesis-tools-connectors-catalog-open',
      path: 'xd.xenesis.tools.connectors.open',
      reason: 'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-connectors-status',
      path: 'xd.xenesis.tools.connectors.status',
      reason: 'Read external tool connector catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS }],
    },
  },
  {
    key: 'mcpInstallDrafts',
    open: {
      id: 'natural-xenesis-tools-mcp-install-drafts-catalog-open',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      reason:
        'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [
        {
          contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
          requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
        },
      ],
    },
    status: {
      id: 'natural-xenesis-tools-mcp-install-drafts-status',
      path: 'xd.xenesis.tools.mcpInstallDrafts.status',
      reason: 'Read external tool MCP install draft catalog status from natural language request.',
      catalogRules: [
        {
          contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
          requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
        },
      ],
    },
  },
  {
    key: 'oauthDrafts',
    open: {
      id: 'natural-xenesis-tools-oauth-drafts-catalog-open',
      path: 'xd.xenesis.tools.oauthDrafts.open',
      reason: 'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-oauth-drafts-status',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      reason: 'Read external tool OAuth draft catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS }],
    },
  },
  {
    key: 'views',
    open: {
      id: 'natural-xenesis-tools-views-catalog-open',
      path: 'xd.xenesis.tools.views.open',
      reason: 'Open external tool view catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-views-status',
      path: 'xd.xenesis.tools.views.status',
      reason: 'Read external tool view catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }],
    },
  },
  {
    key: 'installPlans',
    open: {
      id: 'natural-xenesis-tools-install-plans-catalog-open',
      path: 'xd.xenesis.tools.installPlans.open',
      reason: 'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-install-plans-status',
      path: 'xd.xenesis.tools.installPlans.status',
      reason: 'Read external tool install plan catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS }],
    },
  },
  {
    key: 'setupPlans',
    open: {
      id: 'natural-xenesis-tools-setup-plans-catalog-open',
      path: 'xd.xenesis.tools.setupPlans.open',
      reason: 'Open external tool setup plan catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-setup-plans-status',
      path: 'xd.xenesis.tools.setupPlans.status',
      reason: 'Read external tool setup plan catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS }],
    },
  },
  {
    key: 'setup',
    open: {
      id: 'natural-xenesis-tools-setup-catalog-open',
      path: 'xd.xenesis.tools.setup.open',
      reason: 'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-setup-status',
      path: 'xd.xenesis.tools.setup.status',
      reason: 'Read external tool setup catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS }],
    },
  },
  {
    key: 'actions',
    open: {
      id: 'natural-xenesis-tools-actions-catalog-open',
      path: 'xd.xenesis.tools.actions.open',
      reason: 'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-actions-status',
      path: 'xd.xenesis.tools.actions.status',
      reason: 'Read external tool action policy catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS }],
    },
  },
  {
    key: 'userStories',
    open: {
      id: 'natural-xenesis-tools-user-stories-catalog-open',
      path: 'xd.xenesis.tools.userStories.open',
      reason: 'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-tools-user-stories-status',
      path: 'xd.xenesis.tools.userStories.status',
      reason: 'Read external tool user-story catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS }],
    },
  },
  {
    key: 'catalog',
    open: {
      id: 'natural-xenesis-tool-catalog-open',
      path: 'xd.xenesis.tools.setup.open',
      reason: 'Open external tool catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: [], fallback: true }],
    },
  },
] as const satisfies readonly XenesisNaturalAggregateSurfaceSpec[];

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_SURFACE_SPECS = [
  {
    key: 'profileDrafts',
    open: {
      id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
      path: 'xd.xenesis.channels.profileDrafts.open',
      reason:
        'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-profile-drafts-status',
      path: 'xd.xenesis.channels.profileDrafts.status',
      reason: 'Read external messenger profile draft catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS }],
    },
  },
  {
    key: 'routing',
    open: {
      id: 'natural-xenesis-messengers-routing-catalog-open',
      path: 'xd.xenesis.channels.routing.open',
      reason: 'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-routing-status',
      path: 'xd.xenesis.channels.routing.status',
      reason: 'Read external messenger routing catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS }],
    },
  },
  {
    key: 'safety',
    open: {
      id: 'natural-xenesis-messengers-safety-catalog-open',
      path: 'xd.xenesis.channels.safety.open',
      reason: 'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-safety-status',
      path: 'xd.xenesis.channels.safety.status',
      reason: 'Read external messenger safety catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS }],
    },
  },
  {
    key: 'accessGroups',
    open: {
      id: 'natural-xenesis-messengers-access-groups-catalog-open',
      path: 'xd.xenesis.channels.accessGroups.open',
      reason:
        'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-access-groups-status',
      path: 'xd.xenesis.channels.accessGroups.status',
      reason: 'Read external messenger access-group catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS }],
    },
  },
  {
    key: 'pairing',
    open: {
      id: 'natural-xenesis-messengers-pairing-catalog-open',
      path: 'xd.xenesis.channels.pairing.open',
      reason: 'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-pairing-status',
      path: 'xd.xenesis.channels.pairing.status',
      reason: 'Read external messenger pairing catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS }],
    },
  },
  {
    key: 'userStories',
    open: {
      id: 'natural-xenesis-messengers-user-stories-catalog-open',
      path: 'xd.xenesis.channels.userStories.open',
      reason: 'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-user-stories-status',
      path: 'xd.xenesis.channels.userStories.status',
      reason: 'Read external messenger user-story catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS }],
    },
  },
  {
    key: 'setupPlans',
    open: {
      id: 'natural-xenesis-messengers-setup-plans-catalog-open',
      path: 'xd.xenesis.channels.setupPlans.open',
      reason: 'Open external messenger setup plan catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-setup-plans-status',
      path: 'xd.xenesis.channels.setupPlans.status',
      reason: 'Read external messenger setup plan catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS }],
    },
  },
  {
    key: 'views',
    open: {
      id: 'natural-xenesis-messengers-views-catalog-open',
      path: 'xd.xenesis.messengers.views.open',
      reason: 'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }],
    },
    status: {
      id: 'natural-xenesis-messengers-views-status',
      path: 'xd.xenesis.messengers.views.status',
      reason: 'Read external messenger view catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS }],
    },
  },
  {
    key: 'catalog',
    open: {
      id: 'natural-xenesis-messenger-catalog-open',
      path: 'xd.xenesis.messengers.views.open',
      reason: 'Open external messenger catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: [], fallback: true }],
    },
  },
] as const satisfies readonly XenesisNaturalAggregateSurfaceSpec[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_SURFACE_SPECS = [
  {
    key: 'routing',
    open: {
      id: 'natural-xenesis-providers-routing-catalog-open',
      path: 'xd.xenesis.providers.routing.open',
      reason: 'Open AI provider routing in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS, order: 0 }],
    },
    status: {
      id: 'natural-xenesis-providers-routing-status',
      path: 'xd.xenesis.providers.routing.status',
      reason: 'Read AI provider routing catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS, order: 0 }],
    },
  },
  {
    key: 'setupPlans',
    open: {
      id: 'natural-xenesis-providers-setup-plans-catalog-open',
      path: 'xd.xenesis.providers.setupPlans.open',
      reason: 'Open AI provider setup plan catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS, order: 1 }],
    },
    status: {
      id: 'natural-xenesis-providers-setup-plans-status',
      path: 'xd.xenesis.providers.setupPlans.status',
      reason: 'Read AI provider setup plan catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS, order: 3 }],
    },
  },
  {
    key: 'views',
    open: {
      id: 'natural-xenesis-providers-views-catalog-open',
      path: 'xd.xenesis.providers.views.open',
      reason: 'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS, order: 3 }],
    },
    status: {
      id: 'natural-xenesis-providers-views-status',
      path: 'xd.xenesis.providers.views.status',
      reason: 'Read AI provider view catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS, order: 1 }],
    },
  },
  {
    key: 'profileDrafts',
    open: {
      id: 'natural-xenesis-providers-profile-drafts-catalog-open',
      path: 'xd.xenesis.providers.profileDrafts.open',
      reason: 'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS, order: 4 }],
    },
    status: {
      id: 'natural-xenesis-providers-profile-drafts-status',
      path: 'xd.xenesis.providers.profileDrafts.status',
      reason: 'Read AI provider profile draft catalog status from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS, order: 2 }],
    },
  },
  {
    key: 'setup',
    open: {
      id: 'natural-xenesis-providers-setup-catalog-open',
      path: 'xd.xenesis.providers.setup.open',
      reason: 'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS, order: 2 }],
    },
    status: {
      id: 'natural-xenesis-providers-setup-status',
      path: 'xd.xenesis.providers.setup.status',
      reason: 'Read AI provider setup catalog status from natural language request.',
      catalogRules: [{ contextWords: [], fallback: true, order: 4 }],
    },
  },
  {
    key: 'catalog',
    open: {
      id: 'natural-xenesis-provider-catalog-open',
      path: 'xd.xenesis.providers.setup.open',
      reason: 'Open AI provider catalog in Xenesis Connection Center from natural language request.',
      catalogRules: [{ contextWords: [], fallback: true, order: 5 }],
    },
  },
] as const satisfies readonly XenesisNaturalAggregateSurfaceSpec[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS =
  buildXenesisNaturalAggregateActionDescriptors(XENESIS_NATURAL_CONNECTION_AGGREGATE_SURFACE_SPECS, 'open');
export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS =
  buildXenesisNaturalAggregateActionDescriptors(XENESIS_NATURAL_CONNECTION_AGGREGATE_SURFACE_SPECS, 'status');
export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES = buildXenesisNaturalConnectionAggregateOpenRules(
  XENESIS_NATURAL_CONNECTION_AGGREGATE_SURFACE_SPECS,
);
export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES = buildXenesisNaturalConnectionAggregateStatusRules(
  XENESIS_NATURAL_CONNECTION_AGGREGATE_SURFACE_SPECS,
);

export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS = buildXenesisNaturalAggregateActionDescriptors(
  XENESIS_NATURAL_TOOL_AGGREGATE_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS = buildXenesisNaturalAggregateActionDescriptors(
  XENESIS_NATURAL_TOOL_AGGREGATE_SURFACE_SPECS,
  'status',
);
export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_TOOL_AGGREGATE_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_TOOL_AGGREGATE_SURFACE_SPECS,
  'status',
);

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS =
  buildXenesisNaturalAggregateActionDescriptors(XENESIS_NATURAL_MESSENGER_AGGREGATE_SURFACE_SPECS, 'open');
export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS =
  buildXenesisNaturalAggregateActionDescriptors(XENESIS_NATURAL_MESSENGER_AGGREGATE_SURFACE_SPECS, 'status');
export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_MESSENGER_AGGREGATE_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_MESSENGER_AGGREGATE_SURFACE_SPECS,
  'status',
);

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS = buildXenesisNaturalAggregateActionDescriptors(
  XENESIS_NATURAL_PROVIDER_AGGREGATE_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS =
  buildXenesisNaturalAggregateActionDescriptors(XENESIS_NATURAL_PROVIDER_AGGREGATE_SURFACE_SPECS, 'status');
export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_PROVIDER_AGGREGATE_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES = buildXenesisNaturalAggregateRules(
  XENESIS_NATURAL_PROVIDER_AGGREGATE_SURFACE_SPECS,
  'status',
);

type XenesisNaturalTargetActionMode = 'open' | 'status';
type XenesisNaturalProviderTargetRuleSpec = Omit<XenesisNaturalProviderActionRule, 'action'> & { order?: number };
type XenesisNaturalConnectionTargetRuleSpec = Omit<XenesisNaturalConnectionTargetActionRule, 'action'> & {
  order?: number;
};

interface XenesisNaturalTargetActionSpec<TRule> {
  path: string;
  idPrefix: string;
  reasonFor: (id: string, label: string) => string;
  rules?: readonly TRule[];
}

interface XenesisNaturalProviderTargetSurfaceSpec {
  key: string;
  open?: XenesisNaturalTargetActionSpec<XenesisNaturalProviderTargetRuleSpec>;
  status?: XenesisNaturalTargetActionSpec<XenesisNaturalProviderTargetRuleSpec>;
}

interface XenesisNaturalConnectionTargetSurfaceSpec {
  key: string;
  open?: XenesisNaturalTargetActionSpec<XenesisNaturalConnectionTargetRuleSpec>;
  status?: XenesisNaturalTargetActionSpec<XenesisNaturalConnectionTargetRuleSpec>;
}

type XenesisNaturalActionRequestRuleSpec<TRule> = Omit<TRule, 'action'> & { order?: number };
type XenesisNaturalProviderActionRequestSpec = XenesisNaturalActionRequestSpec<XenesisNaturalProviderActionRule>;
type XenesisNaturalConnectionTargetActionRequestSpec =
  XenesisNaturalActionRequestSpec<XenesisNaturalConnectionTargetActionRule>;

interface XenesisNaturalActionRequestSpec<TRule> {
  key: string;
  path: string;
  idPrefix: string;
  reasonFor: (id: string, label: string) => string;
  rules?: readonly XenesisNaturalActionRequestRuleSpec<TRule>[];
}

function buildXenesisNaturalTargetActionDescriptors(
  specs: readonly {
    key: string;
    open?: XenesisNaturalTargetActionSpec<unknown>;
    status?: XenesisNaturalTargetActionSpec<unknown>;
  }[],
  mode: XenesisNaturalTargetActionMode,
): Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>> {
  return Object.fromEntries(
    specs.flatMap((spec) => {
      const action = spec[mode];
      return action
        ? [
            [
              spec.key,
              {
                path: action.path,
                idFor: (id: string, _label: string) => `${action.idPrefix}-${id}`,
                reasonFor: action.reasonFor,
              },
            ],
          ]
        : [];
    }),
  );
}

function buildXenesisNaturalProviderTargetRules(
  specs: readonly XenesisNaturalProviderTargetSurfaceSpec[],
  mode: XenesisNaturalTargetActionMode,
): XenesisNaturalProviderActionRule[] {
  const descriptors = buildXenesisNaturalTargetActionDescriptors(specs, mode);
  return specs
    .flatMap((spec, specIndex) => {
      const action = spec[mode];
      const descriptor = descriptors[spec.key];
      if (!action || !descriptor) return [];
      return (action.rules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => {
      const { order: _order, ...ruleInput } = rule;
      return { ...ruleInput, action: descriptor };
    });
}

function buildXenesisNaturalConnectionTargetRules(
  specs: readonly XenesisNaturalConnectionTargetSurfaceSpec[],
  mode: XenesisNaturalTargetActionMode,
): XenesisNaturalConnectionTargetActionRule[] {
  const descriptors = buildXenesisNaturalTargetActionDescriptors(specs, mode);
  return specs
    .flatMap((spec, specIndex) => {
      const action = spec[mode];
      const descriptor = descriptors[spec.key];
      if (!action || !descriptor) return [];
      return (action.rules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => {
      const { order: _order, ...ruleInput } = rule;
      return { ...ruleInput, action: descriptor };
    });
}

function buildXenesisNaturalActionRequestDescriptors(
  specs: readonly {
    key: string;
    path: string;
    idPrefix: string;
    reasonFor: (id: string, label: string) => string;
  }[],
): Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>> {
  return Object.fromEntries(
    specs.map((spec) => [
      spec.key,
      {
        path: spec.path,
        idFor: (id: string, _label: string) => `${spec.idPrefix}-${id}`,
        reasonFor: spec.reasonFor,
      },
    ]),
  );
}

function buildXenesisNaturalProviderActionRequestRules(
  specs: readonly XenesisNaturalProviderActionRequestSpec[],
  keys: readonly string[],
): XenesisNaturalProviderActionRule[] {
  const keySet = new Set(keys);
  const descriptors = buildXenesisNaturalActionRequestDescriptors(specs);
  return specs
    .flatMap((spec, specIndex) => {
      const descriptor = descriptors[spec.key];
      if (!keySet.has(spec.key) || !descriptor) return [];
      return (spec.rules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => {
      const { order: _order, ...ruleInput } = rule;
      return { ...ruleInput, action: descriptor };
    });
}

function buildXenesisNaturalConnectionTargetActionRequestRules(
  specs: readonly XenesisNaturalConnectionTargetActionRequestSpec[],
  keys: readonly string[],
): XenesisNaturalConnectionTargetActionRule[] {
  const keySet = new Set(keys);
  const descriptors = buildXenesisNaturalActionRequestDescriptors(specs);
  return specs
    .flatMap((spec, specIndex) => {
      const descriptor = descriptors[spec.key];
      if (!keySet.has(spec.key) || !descriptor) return [];
      return (spec.rules ?? []).map((rule, ruleIndex) => ({
        descriptor,
        order: rule.order ?? specIndex * 100 + ruleIndex,
        rule,
      }));
    })
    .sort((left, right) => left.order - right.order)
    .map(({ descriptor, rule }) => {
      const { order: _order, ...ruleInput } = rule;
      return { ...ruleInput, action: descriptor };
    });
}

function pickXenesisNaturalActionRequestDescriptors<TAlias extends string>(
  descriptors: Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>,
  aliases: Record<TAlias, string>,
): Record<TAlias, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>> {
  return Object.fromEntries(
    (Object.entries(aliases) as [TAlias, string][]).map(([alias, key]) => {
      const descriptor = descriptors[key];
      if (!descriptor) {
        throw new Error(`Missing Xenesis natural action request descriptor for ${key}`);
      }
      return [alias, descriptor];
    }),
  ) as Record<TAlias, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;
}

export const XENESIS_NATURAL_PROVIDER_TARGET_SURFACE_SPECS = [
  {
    key: 'routing',
    open: {
      path: 'xd.xenesis.providers.routing.open',
      idPrefix: 'natural-xenesis-provider-routing-open',
      reasonFor: (_id: string, label: string) => `Open ${label} provider routing from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS, argsKind: 'providerVisible', order: 0 }],
    },
    status: {
      path: 'xd.xenesis.providers.routing.status',
      idPrefix: 'natural-xenesis-provider-routing-status',
      reasonFor: (_id: string, label: string) => `Read ${label} provider routing status from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS, argsKind: 'provider', order: 0 }],
    },
  },
  {
    key: 'profileDrafts',
    open: {
      path: 'xd.xenesis.providers.profileDrafts.open',
      idPrefix: 'natural-xenesis-provider-profile-draft-open',
      reasonFor: (_id: string, label: string) => `Open ${label} provider profile draft from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS, argsKind: 'providerVisible', order: 1 }],
    },
    status: {
      path: 'xd.xenesis.providers.profileDrafts.status',
      idPrefix: 'natural-xenesis-provider-profile-draft-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} provider profile draft status from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS, argsKind: 'provider', order: 2 }],
    },
  },
  {
    key: 'views',
    open: {
      path: 'xd.xenesis.providers.views.open',
      idPrefix: 'natural-xenesis-provider-view-open',
      reasonFor: (_id: string, label: string) => `Open ${label} provider view from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS, argsKind: 'providerVisible', order: 2 }],
    },
    status: {
      path: 'xd.xenesis.providers.views.status',
      idPrefix: 'natural-xenesis-provider-view-status',
      reasonFor: (_id: string, label: string) => `Read ${label} provider view status from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS, argsKind: 'provider', order: 1 }],
    },
  },
  {
    key: 'setupPlans',
    open: {
      path: 'xd.xenesis.providers.setupPlans.open',
      idPrefix: 'natural-xenesis-provider-setup-plan-open',
      reasonFor: (_id: string, label: string) => `Open ${label} provider setup plan from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS, argsKind: 'providerVisible', order: 3 }],
    },
    status: {
      path: 'xd.xenesis.providers.setupPlans.status',
      idPrefix: 'natural-xenesis-provider-setup-plan-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} provider setup plan status from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS, argsKind: 'provider', order: 3 }],
    },
  },
  {
    key: 'setup',
    open: {
      path: 'xd.xenesis.providers.setup.open',
      idPrefix: 'natural-xenesis-provider-setup-open',
      reasonFor: (_id: string, label: string) => `Open ${label} provider setup from natural language request.`,
      rules: [{ contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS, argsKind: 'providerVisible', order: 4 }],
    },
    status: {
      path: 'xd.xenesis.providers.setup.status',
      idPrefix: 'natural-xenesis-provider-setup-status',
      reasonFor: (_id: string, label: string) => `Read ${label} provider setup status from natural language request.`,
      rules: [{ contextWords: [], argsKind: 'provider', fallback: true, order: 4 }],
    },
  },
] as const satisfies readonly XenesisNaturalProviderTargetSurfaceSpec[];

export const XENESIS_NATURAL_CONNECTION_TARGET_SURFACE_SPECS = [
  {
    key: 'diagnostics',
    open: {
      path: 'xd.xenesis.connections.diagnostics.open',
      idPrefix: 'natural-xenesis-connection-diagnostics-open',
      reasonFor: (_id: string, label: string) => `Open ${label} connection diagnostics from natural language request.`,
      rules: [
        {
          targetScope: 'any',
          contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 0,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.connections.diagnostics.status',
      idPrefix: 'natural-xenesis-connection-diagnostics-status',
      reasonFor: (_id: string, label: string) => `Read ${label} connection diagnostics from natural language request.`,
      rules: [
        {
          targetScope: 'any',
          contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 0,
        },
        { targetScope: 'any', contextWords: [], argsKind: 'targetId', fallback: true, order: 19 },
      ],
    },
  },
  {
    key: 'setupRequest',
    open: {
      path: 'xd.xenesis.connections.setupRequests.open',
      idPrefix: 'natural-xenesis-connection-setup-request-open',
      reasonFor: (_id: string, label: string) =>
        `Open ${label} connection setup request from natural language request.`,
      rules: [
        {
          targetScope: 'any',
          contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 1,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.connections.setupRequests.status',
      idPrefix: 'natural-xenesis-connection-setup-request-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} connection setup request status from natural language request.`,
      rules: [
        {
          targetScope: 'any',
          contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 1,
        },
      ],
    },
  },
  {
    key: 'toolMcpInstallDraft',
    open: {
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      idPrefix: 'natural-xenesis-tool-mcp-install-draft-open',
      reasonFor: (_id: string, label: string) => `Open ${label} MCP install draft from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 3,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.mcpInstallDrafts.status',
      idPrefix: 'natural-xenesis-tool-mcp-install-draft-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} MCP install draft status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS, argsKind: 'tool', order: 2 },
      ],
    },
  },
  {
    key: 'toolMcpOAuth',
    open: {
      path: 'xd.xenesis.tools.mcpOAuth.open',
      idPrefix: 'natural-xenesis-tool-mcp-oauth-open',
      reasonFor: (_id: string, label: string) => `Open ${label} MCP OAuth readiness from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
          requiredContextWordGroups: [XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS],
          argsKind: 'targetIdVisible',
          order: 2,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.mcpOAuth.status',
      idPrefix: 'natural-xenesis-tool-mcp-oauth-status',
      reasonFor: (_id: string, label: string) => `Read ${label} MCP OAuth readiness from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
          requiredContextWordGroups: [XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS],
          argsKind: 'targetId',
          order: 1,
        },
      ],
    },
  },
  {
    key: 'toolOauthDraft',
    open: {
      path: 'xd.xenesis.tools.oauthDrafts.open',
      idPrefix: 'natural-xenesis-tool-oauth-draft-open',
      reasonFor: (_id: string, label: string) => `Open ${label} OAuth draft from natural language request.`,
      rules: [
        {
          targetScope: 'planned-google-tool',
          contextWords: XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 2,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.oauthDrafts.status',
      idPrefix: 'natural-xenesis-tool-oauth-draft-status',
      reasonFor: (_id: string, label: string) => `Read ${label} OAuth draft status from natural language request.`,
      rules: [
        {
          targetScope: 'planned-google-tool',
          contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 3,
        },
      ],
    },
  },
  {
    key: 'toolOauthSetupPacket',
    open: {
      path: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
      idPrefix: 'natural-xenesis-tool-oauth-setup-packet-open',
      reasonFor: (_id: string, label: string) => `Open ${label} OAuth setup packet from natural language request.`,
      rules: [
        {
          targetScope: 'planned-google-tool',
          contextWords: XENESIS_NATURAL_OAUTH_SETUP_PACKET_CONTEXT_WORDS,
          requiredContextWordGroups: [['패킷', 'packet', 'redirect uri', '리디렉션']],
          argsKind: 'targetIdVisible',
          order: 1,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.oauthDrafts.setupPacket',
      idPrefix: 'natural-xenesis-tool-oauth-setup-packet',
      reasonFor: (_id: string, label: string) => `Read ${label} OAuth setup packet from natural language request.`,
    },
  },
  {
    key: 'toolUserStory',
    open: {
      path: 'xd.xenesis.tools.userStories.open',
      idPrefix: 'natural-xenesis-tool-user-story-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool user story from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 4,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.userStories.status',
      idPrefix: 'natural-xenesis-tool-user-story-status',
      reasonFor: (_id: string, label: string) => `Read ${label} tool user story status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS, argsKind: 'tool', order: 4 },
      ],
    },
  },
  {
    key: 'toolActionPolicy',
    open: {
      path: 'xd.xenesis.tools.actions.open',
      idPrefix: 'natural-xenesis-tool-action-policy-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool action policy from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 5,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.actions.status',
      idPrefix: 'natural-xenesis-tool-action-policy-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} tool action policy status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS, argsKind: 'tool', order: 5 },
      ],
    },
  },
  {
    key: 'toolInstallPlan',
    open: {
      path: 'xd.xenesis.tools.installPlans.open',
      idPrefix: 'natural-xenesis-tool-install-plan-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool install plan from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 6,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.installPlans.status',
      idPrefix: 'natural-xenesis-tool-install-plan-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} tool install plan status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS, argsKind: 'tool', order: 6 },
      ],
    },
  },
  {
    key: 'toolSetupPlan',
    open: {
      path: 'xd.xenesis.tools.setupPlans.open',
      idPrefix: 'natural-xenesis-tool-setup-plan-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool setup plan from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 7,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.setupPlans.status',
      idPrefix: 'natural-xenesis-tool-setup-plan-status',
      reasonFor: (_id: string, label: string) => `Read ${label} tool setup plan status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS, argsKind: 'targetId', order: 7 },
      ],
    },
  },
  {
    key: 'toolSetup',
    open: {
      path: 'xd.xenesis.tools.setup.open',
      idPrefix: 'natural-xenesis-tool-setup-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool setup from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 9,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.setup.status',
      idPrefix: 'natural-xenesis-tool-setup-status',
      reasonFor: (_id: string, label: string) => `Read ${label} tool setup status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS, argsKind: 'targetId', order: 8 },
      ],
    },
  },
  {
    key: 'toolConnector',
    open: {
      path: 'xd.xenesis.tools.connectors.open',
      idPrefix: 'natural-xenesis-tool-connector-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool connector from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 8,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.connectors.status',
      idPrefix: 'natural-xenesis-tool-connector-status',
      reasonFor: (_id: string, label: string) => `Read ${label} tool connector status from natural language request.`,
      rules: [
        { targetScope: 'tool', contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS, argsKind: 'tool', order: 9 },
      ],
    },
  },
  {
    key: 'toolView',
    open: {
      path: 'xd.xenesis.tools.views.open',
      idPrefix: 'natural-xenesis-tool-view-open',
      reasonFor: (_id: string, label: string) => `Open ${label} tool view from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 10,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.tools.views.status',
      idPrefix: 'natural-xenesis-tool-view-status',
      reasonFor: (_id: string, label: string) => `Read ${label} tool view status from natural language request.`,
      rules: [
        {
          targetScope: 'tool',
          contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 10,
        },
      ],
    },
  },
  {
    key: 'channelRouting',
    open: {
      path: 'xd.xenesis.channels.routing.open',
      idPrefix: 'natural-xenesis-channel-routing-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel routing from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
          argsKind: 'channelVisible',
          order: 14,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.routing.status',
      idPrefix: 'natural-xenesis-channel-routing-status',
      reasonFor: (_id: string, label: string) => `Read ${label} channel routing status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
          argsKind: 'channel',
          order: 11,
        },
      ],
    },
  },
  {
    key: 'channelSafety',
    open: {
      path: 'xd.xenesis.channels.safety.open',
      idPrefix: 'natural-xenesis-channel-safety-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel safety from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
          argsKind: 'channelVisible',
          order: 15,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.safety.status',
      idPrefix: 'natural-xenesis-channel-safety-status',
      reasonFor: (_id: string, label: string) => `Read ${label} channel safety status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
          argsKind: 'channel',
          order: 12,
        },
      ],
    },
  },
  {
    key: 'channelAccessGroups',
    open: {
      path: 'xd.xenesis.channels.accessGroups.open',
      idPrefix: 'natural-xenesis-channel-access-groups-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel access groups from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
          argsKind: 'channelVisible',
          order: 16,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.accessGroups.status',
      idPrefix: 'natural-xenesis-channel-access-groups-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} channel access groups status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
          argsKind: 'channel',
          order: 13,
        },
      ],
    },
  },
  {
    key: 'channelPairing',
    open: {
      path: 'xd.xenesis.channels.pairing.open',
      idPrefix: 'natural-xenesis-channel-pairing-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel pairing from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
          argsKind: 'channelVisible',
          order: 17,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.pairing.status',
      idPrefix: 'natural-xenesis-channel-pairing-status',
      reasonFor: (_id: string, label: string) => `Read ${label} channel pairing status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
          argsKind: 'channel',
          order: 14,
        },
      ],
    },
  },
  {
    key: 'channelUserStory',
    open: {
      path: 'xd.xenesis.channels.userStories.open',
      idPrefix: 'natural-xenesis-channel-user-story-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel user story from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 11,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.userStories.status',
      idPrefix: 'natural-xenesis-channel-user-story-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} channel user story status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 15,
        },
      ],
    },
  },
  {
    key: 'channelSetupPlan',
    open: {
      path: 'xd.xenesis.channels.setupPlans.open',
      idPrefix: 'natural-xenesis-channel-setup-plan-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel setup plan from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 12,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.setupPlans.status',
      idPrefix: 'natural-xenesis-channel-setup-plan-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} channel setup plan status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 16,
        },
      ],
    },
  },
  {
    key: 'channelProfileDraft',
    open: {
      path: 'xd.xenesis.channels.profileDrafts.open',
      idPrefix: 'natural-xenesis-channel-profile-draft-open',
      reasonFor: (_id: string, label: string) => `Open ${label} channel profile draft from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
          argsKind: 'channelVisible',
          order: 13,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.channels.profileDrafts.status',
      idPrefix: 'natural-xenesis-channel-profile-draft-status',
      reasonFor: (_id: string, label: string) =>
        `Read ${label} channel profile draft status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
          argsKind: 'channel',
          order: 17,
        },
      ],
    },
  },
  {
    key: 'messengerView',
    open: {
      path: 'xd.xenesis.messengers.views.open',
      idPrefix: 'natural-xenesis-messenger-view-open',
      reasonFor: (_id: string, label: string) => `Open ${label} messenger view from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
          argsKind: 'targetIdVisible',
          order: 18,
        },
      ],
    },
    status: {
      path: 'xd.xenesis.messengers.views.status',
      idPrefix: 'natural-xenesis-messenger-view-status',
      reasonFor: (_id: string, label: string) => `Read ${label} messenger view status from natural language request.`,
      rules: [
        {
          targetScope: 'messenger',
          contextWords: XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
          argsKind: 'targetId',
          order: 18,
        },
      ],
    },
  },
  {
    key: 'connectionCard',
    open: {
      path: 'xd.xenesis.connections.open',
      idPrefix: 'natural-xenesis-connection-open',
      reasonFor: (_id: string, label: string) => `Open ${label} connection card from natural language request.`,
      rules: [{ targetScope: 'any', contextWords: [], argsKind: 'targetIdVisible', fallback: true, order: 19 }],
    },
  },
] as const satisfies readonly XenesisNaturalConnectionTargetSurfaceSpec[];

export const XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS = buildXenesisNaturalTargetActionDescriptors(
  XENESIS_NATURAL_PROVIDER_TARGET_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS = buildXenesisNaturalTargetActionDescriptors(
  XENESIS_NATURAL_PROVIDER_TARGET_SURFACE_SPECS,
  'status',
);
export const XENESIS_NATURAL_PROVIDER_STATUS_RULES = buildXenesisNaturalProviderTargetRules(
  XENESIS_NATURAL_PROVIDER_TARGET_SURFACE_SPECS,
  'status',
);
export const XENESIS_NATURAL_PROVIDER_OPEN_RULES = buildXenesisNaturalProviderTargetRules(
  XENESIS_NATURAL_PROVIDER_TARGET_SURFACE_SPECS,
  'open',
);

export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS = buildXenesisNaturalTargetActionDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_SURFACE_SPECS,
  'status',
);
export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES = buildXenesisNaturalConnectionTargetRules(
  XENESIS_NATURAL_CONNECTION_TARGET_SURFACE_SPECS,
  'status',
);

interface XenesisNaturalConnectionTargetActionKeyRuleSpec
  extends Omit<XenesisNaturalConnectionTargetActionRule, 'action'> {
  actionKey: keyof typeof XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS;
}

export const XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULE_SPECS = [
  {
    actionKey: 'toolOauthSetupPacket',
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_SETUP_PACKET_CONTEXT_WORDS,
    requiredContextWordGroups: [['패킷', 'packet', 'redirect uri', '리디렉션']],
    argsKind: 'targetId',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionKeyRuleSpec[];

export const buildXenesisNaturalConnectionTargetActionKeyRules = (
  actionDescriptors: typeof XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS,
  specs: readonly XenesisNaturalConnectionTargetActionKeyRuleSpec[],
) =>
  specs.map(({ actionKey, ...rule }) => ({
    ...rule,
    action: actionDescriptors[actionKey],
  })) as readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULES = buildXenesisNaturalConnectionTargetActionKeyRules(
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULE_SPECS,
);

export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS = buildXenesisNaturalTargetActionDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_SURFACE_SPECS,
  'open',
);
export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES = buildXenesisNaturalConnectionTargetRules(
  XENESIS_NATURAL_CONNECTION_TARGET_SURFACE_SPECS,
  'open',
);

export const XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_SPECS = [
  {
    key: 'providerProfileDraftRequest',
    path: 'xd.xenesis.providers.profileDrafts.request',
    idPrefix: 'natural-xenesis-provider-profile-draft-request',
    reasonFor: (id: string, label: string) =>
      id === 'auto'
        ? 'Request AI provider profile draft review from natural language request.'
        : `Request ${label} provider profile draft review from natural language request.`,
    rules: [{ contextWords: [], argsKind: 'provider', fallback: true, order: 0 }],
  },
  {
    key: 'providerProfileDraftApply',
    path: 'xd.xenesis.providers.profileDrafts.apply',
    idPrefix: 'natural-xenesis-provider-profile-draft-apply',
    reasonFor: (id: string, label: string) =>
      id === 'auto'
        ? 'Apply AI provider profile draft from natural language request.'
        : `Apply ${label} provider profile draft from natural language request.`,
    rules: [{ contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS, argsKind: 'provider', order: 0 }],
  },
] as const satisfies readonly XenesisNaturalProviderActionRequestSpec[];

export const XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS = [
  {
    key: 'toolInstallPlanRequest',
    path: 'xd.xenesis.tools.installPlans.request',
    idPrefix: 'natural-xenesis-tool-install-plan-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool install plan review from natural language request.`,
    rules: [{ targetScope: 'tool', contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS, argsKind: 'targetId' }],
  },
  {
    key: 'toolMcpInstallDraftRequest',
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    idPrefix: 'natural-xenesis-tool-mcp-install-draft-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} MCP install draft review from natural language request.`,
    rules: [
      {
        targetScope: 'tool',
        contextWords: XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
        argsKind: 'targetId',
      },
    ],
  },
  {
    key: 'toolOauthDraftRequest',
    path: 'xd.xenesis.tools.oauthDrafts.request',
    idPrefix: 'natural-xenesis-tool-oauth-draft-request',
    reasonFor: (_id: string, label: string) => `Request ${label} OAuth draft review from natural language request.`,
    rules: [
      {
        targetScope: 'planned-google-tool',
        contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
        argsKind: 'targetId',
      },
    ],
  },
  {
    key: 'toolMcpOAuthRequest',
    path: 'xd.xenesis.tools.mcpOAuth.request',
    idPrefix: 'natural-xenesis-tool-mcp-oauth-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} MCP OAuth readiness review from natural language request.`,
    rules: [
      {
        targetScope: 'tool',
        contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS],
        argsKind: 'targetId',
        order: 1,
      },
    ],
  },
  {
    key: 'toolActionPolicyRequest',
    path: 'xd.xenesis.tools.actions.request',
    idPrefix: 'natural-xenesis-tool-action-policy-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool action policy review from natural language request.`,
    rules: [{ targetScope: 'tool', contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS, argsKind: 'targetId' }],
  },
  {
    key: 'channelProfileDraftRequest',
    path: 'xd.xenesis.channels.profileDrafts.request',
    idPrefix: 'natural-xenesis-channel-profile-draft-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} channel profile draft review from natural language request.`,
    rules: [
      {
        targetScope: 'messenger',
        contextWords: XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS,
        argsKind: 'channel',
      },
    ],
  },
  {
    key: 'connectionSetupRequest',
    path: 'xd.xenesis.connections.setupRequests.request',
    idPrefix: 'natural-xenesis-connection-setup-request',
    reasonFor: (_id: string, label: string) =>
      `Request ${label} connection setup review from natural language request.`,
    rules: [{ targetScope: 'any', contextWords: [], argsKind: 'targetId', fallback: true }],
  },
  {
    key: 'toolMcpInstallDraftApply',
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    idPrefix: 'natural-xenesis-tool-mcp-install-draft-apply',
    reasonFor: (_id: string, label: string) => `Apply ${label} MCP install draft from natural language request.`,
    rules: [
      {
        targetScope: 'tool',
        contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS],
        argsKind: 'mcpInstallApply',
      },
    ],
  },
  {
    key: 'channelProfileDraftApply',
    path: 'xd.xenesis.channels.profileDrafts.apply',
    idPrefix: 'natural-xenesis-channel-profile-draft-apply',
    reasonFor: (_id: string, label: string) => `Apply ${label} channel profile draft from natural language request.`,
    rules: [
      {
        targetScope: 'messenger',
        contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS],
        argsKind: 'channel',
      },
    ],
  },
  {
    key: 'channelTest',
    path: 'xd.xenesis.profiles.testChannel',
    idPrefix: 'natural-xenesis-channel-test',
    reasonFor: (_id: string, label: string) =>
      `Send a sanitized ${label} channel test message from natural language request.`,
    rules: [
      {
        targetScope: 'messenger',
        contextWords: XENESIS_NATURAL_CHANNEL_TEST_CONTEXT_WORDS,
        argsKind: 'channel',
      },
    ],
  },
  {
    key: 'connectionSetupApply',
    path: 'xd.xenesis.connections.setupRequests.apply',
    idPrefix: 'natural-xenesis-connection-setup-apply',
    reasonFor: (_id: string, label: string) => `Apply ${label} connection setup request from natural language request.`,
    rules: [
      {
        targetScope: 'any',
        contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
        requiredContextWordGroups: [XENESIS_NATURAL_SETUP_CONTEXT_WORDS],
        argsKind: 'mcpInstallApply',
      },
    ],
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRequestSpec[];

export const XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_DESCRIPTORS = buildXenesisNaturalActionRequestDescriptors(
  XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_SPECS,
);
export const XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS = buildXenesisNaturalActionRequestDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS,
);

export const XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_ACTION_DESCRIPTORS = pickXenesisNaturalActionRequestDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS,
  { toolMcpInstallDraft: 'toolMcpInstallDraftApply' },
);
export const XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_TARGET_RULES =
  buildXenesisNaturalConnectionTargetActionRequestRules(XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS, [
    'toolMcpInstallDraftApply',
  ]);

export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS =
  pickXenesisNaturalActionRequestDescriptors(XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS, {
    channelProfileDraft: 'channelProfileDraftApply',
  });
export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_TARGET_RULES =
  buildXenesisNaturalConnectionTargetActionRequestRules(XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS, [
    'channelProfileDraftApply',
  ]);

export const XENESIS_NATURAL_CHANNEL_TEST_ACTION_DESCRIPTORS = pickXenesisNaturalActionRequestDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS,
  { channelTest: 'channelTest' },
);
export const XENESIS_NATURAL_CHANNEL_TEST_TARGET_RULES = buildXenesisNaturalConnectionTargetActionRequestRules(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS,
  ['channelTest'],
);

export const XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS =
  pickXenesisNaturalActionRequestDescriptors(XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_DESCRIPTORS, {
    providerProfileDraft: 'providerProfileDraftApply',
  });
export const XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_PROVIDER_RULES =
  buildXenesisNaturalProviderActionRequestRules(XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_SPECS, [
    'providerProfileDraftApply',
  ]);

export const XENESIS_NATURAL_CONNECTION_SETUP_APPLY_ACTION_DESCRIPTORS = pickXenesisNaturalActionRequestDescriptors(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS,
  {
    connectionSetupRequest: 'connectionSetupApply',
  },
);
export const XENESIS_NATURAL_CONNECTION_SETUP_APPLY_TARGET_RULES =
  buildXenesisNaturalConnectionTargetActionRequestRules(XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS, [
    'connectionSetupApply',
  ]);

export const XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTOR_SPECS = [
  { alias: 'providerProfileDraft', source: 'provider', key: 'providerProfileDraftRequest' },
  { alias: 'toolInstallPlan', source: 'connectionTarget', key: 'toolInstallPlanRequest' },
  { alias: 'toolMcpInstallDraft', source: 'connectionTarget', key: 'toolMcpInstallDraftRequest' },
  { alias: 'toolOauthDraft', source: 'connectionTarget', key: 'toolOauthDraftRequest' },
  { alias: 'toolMcpOAuth', source: 'connectionTarget', key: 'toolMcpOAuthRequest' },
  { alias: 'toolActionPolicy', source: 'connectionTarget', key: 'toolActionPolicyRequest' },
  { alias: 'channelProfileDraft', source: 'connectionTarget', key: 'channelProfileDraftRequest' },
  { alias: 'connectionSetupRequest', source: 'connectionTarget', key: 'connectionSetupRequest' },
] as const satisfies readonly {
  alias: string;
  source: 'provider' | 'connectionTarget';
  key: string;
}[];

export const buildXenesisNaturalReviewRequestActionDescriptors = (
  providerDescriptors: Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>,
  connectionTargetDescriptors: Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>,
  specs: typeof XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTOR_SPECS,
) => {
  const sources = {
    provider: providerDescriptors,
    connectionTarget: connectionTargetDescriptors,
  } as const;

  return Object.fromEntries(specs.map((spec) => [spec.alias, sources[spec.source][spec.key]])) as Record<
    string,
    XenesisNaturalDeskActionTemplateDescriptor<[string, string]>
  >;
};

export const XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS = buildXenesisNaturalReviewRequestActionDescriptors(
  XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_DESCRIPTORS,
  XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTOR_SPECS,
);

export const XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES = buildXenesisNaturalProviderActionRequestRules(
  XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_SPECS,
  ['providerProfileDraftRequest'],
);
export const XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES = buildXenesisNaturalConnectionTargetActionRequestRules(
  XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS,
  [
    'toolInstallPlanRequest',
    'toolMcpInstallDraftRequest',
    'toolOauthDraftRequest',
    'toolMcpOAuthRequest',
    'toolActionPolicyRequest',
    'channelProfileDraftRequest',
    'connectionSetupRequest',
  ],
);

export function buildXenesisNaturalAction(
  id: string,
  path: string,
  args: unknown,
  reason: string,
): XenesisNaturalDeskActionRequest {
  return { id, path, args, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending, reason };
}

export function buildXenesisNaturalCatalogAction(
  descriptor: XenesisNaturalDeskActionDescriptor,
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalDeskActionRequest {
  return buildXenesisNaturalAction(descriptor.id, descriptor.path, args, descriptor.reason);
}

export function buildXenesisNaturalTemplateAction<TArgs extends unknown[]>(
  descriptor: XenesisNaturalDeskActionTemplateDescriptor<TArgs>,
  templateArgs: TArgs,
  args: unknown,
): XenesisNaturalDeskActionRequest {
  return buildXenesisNaturalAction(
    descriptor.idFor(...templateArgs),
    descriptor.path,
    args,
    descriptor.reasonFor(...templateArgs),
  );
}

export function findXenesisNaturalCoreToolTarget(value: string): XenesisNaturalCoreToolTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CORE_TOOL_TARGETS);
}

export function findXenesisNaturalViewTarget(value: string): XenesisNaturalViewTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_VIEW_TARGETS);
}

export function buildXenesisNaturalCoreToolOpenAction(
  definition: XenesisNaturalCoreToolTarget,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest {
  return {
    id: definition.id,
    path: definition.path,
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.placement(placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement),
    approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending,
    reason: XENESIS_NATURAL_CORE_TOOL_OPEN_REASON(definition.reasonName),
  };
}

export function buildXenesisNaturalViewOpenAction(
  view: Pick<XenesisNaturalViewTarget, 'id' | 'kind' | 'reason'>,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest {
  return {
    id: view.id,
    path: XENESIS_NATURAL_VIEW_OPEN_PATH,
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.withPlacement(
      XENESIS_NATURAL_DESK_ACTION_ARGS.viewKind(view.kind),
      placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
    ),
    approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending,
    reason: view.reason,
  };
}

export function findXenesisNaturalCatalogRuleAction(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalDeskActionRequest | null {
  const rule = findXenesisNaturalContextRule(value, rules);
  return rule ? buildXenesisNaturalCatalogAction(rule.action, args) : null;
}

export function findXenesisNaturalCatalogRule(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
): XenesisNaturalCatalogActionRule | null {
  return findXenesisNaturalContextRule(value, rules);
}

export function findXenesisNaturalCatalogRulePlan(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalLanguagePlan | null {
  const rule = findXenesisNaturalCatalogRule(value, rules);
  if (!rule?.visibleText) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [buildXenesisNaturalCatalogAction(rule.action, args)]);
}

export function xenesisNaturalConnectionTargetMatchesRule(
  target: XenesisNaturalConnectionTarget,
  rule: XenesisNaturalConnectionTargetActionRule,
): boolean {
  if (rule.targetScope === 'any') return true;
  if (rule.targetScope === 'tool') return isXenesisNaturalConnectionToolTarget(target);
  if (rule.targetScope === 'messenger') return isXenesisNaturalConnectionMessengerTarget(target);
  return isXenesisNaturalPlannedGoogleToolTarget(target);
}

export function buildXenesisNaturalConnectionTargetArgsForRule(
  rule: XenesisNaturalConnectionTargetActionRule,
  target: XenesisNaturalConnectionTarget,
): unknown {
  if (rule.argsKind === 'targetId') return XENESIS_NATURAL_DESK_ACTION_ARGS.targetId(target.id);
  if (rule.argsKind === 'targetIdVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.targetIdVisible(target.id);
  if (rule.argsKind === 'tool') return XENESIS_NATURAL_DESK_ACTION_ARGS.tool(target.id);
  if (rule.argsKind === 'mcpInstallApply') return XENESIS_NATURAL_DESK_ACTION_ARGS.mcpInstallApply(target.id);
  if (rule.argsKind === 'channelVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.channelVisible(target.id);
  return XENESIS_NATURAL_DESK_ACTION_ARGS.channel(target.id);
}

export function findXenesisNaturalConnectionTargetRuleAction(
  value: string,
  target: XenesisNaturalConnectionTarget,
  rules: readonly XenesisNaturalConnectionTargetActionRule[],
): XenesisNaturalDeskActionRequest | null {
  for (const rule of rules) {
    if (!xenesisNaturalConnectionTargetMatchesRule(target, rule)) continue;
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    return buildXenesisNaturalTemplateAction(
      rule.action,
      [target.id, target.label],
      buildXenesisNaturalConnectionTargetArgsForRule(rule, target),
    );
  }

  return null;
}

export function buildXenesisNaturalProviderArgsForRule(
  rule: XenesisNaturalProviderActionRule,
  provider: Pick<XenesisNaturalWordsTarget, 'id'>,
): unknown {
  if (rule.argsKind === 'providerVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.providerVisible(provider.id);
  return XENESIS_NATURAL_DESK_ACTION_ARGS.provider(provider.id);
}

export function findXenesisNaturalProviderRuleAction(
  value: string,
  provider: Pick<XenesisNaturalWordsTarget, 'id' | 'label'>,
  rules: readonly XenesisNaturalProviderActionRule[],
): XenesisNaturalDeskActionRequest | null {
  for (const rule of rules) {
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    return buildXenesisNaturalTemplateAction(
      rule.action,
      [provider.id, provider.label],
      buildXenesisNaturalProviderArgsForRule(rule, provider),
    );
  }

  return null;
}

export function buildXenesisNaturalOnboardingArgsForRule(
  rule: XenesisNaturalOnboardingActionRule,
  id?: string,
): unknown {
  if (rule.argsKind === 'ensureVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible();
  if (rule.argsKind === 'targetIdVisible') {
    return XENESIS_NATURAL_DESK_ACTION_ARGS.targetIdVisible(id || XENESIS_NATURAL_TEXT_DEFAULTS.empty);
  }
  return XENESIS_NATURAL_DESK_ACTION_ARGS.targetId(id || XENESIS_NATURAL_TEXT_DEFAULTS.empty);
}

export function matchesXenesisNaturalConnectionAggregateRule(
  value: string,
  matchKind: XenesisNaturalConnectionAggregateRuleMatchKind,
): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES[matchKind]);
}

export function findXenesisNaturalConnectionAggregateStatusAction(
  value: string,
  stage: XenesisNaturalConnectionAggregateStatusRuleStage,
): XenesisNaturalDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES) {
    if (rule.stage !== stage) continue;
    if (!matchesXenesisNaturalConnectionAggregateRule(value, rule.matchKind)) continue;
    return buildXenesisNaturalCatalogAction(rule.action);
  }

  return null;
}

export function findXenesisNaturalConnectionAggregateOpenAction(
  value: string,
  stage: XenesisNaturalConnectionAggregateOpenRuleStage,
): XenesisNaturalDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES) {
    if (rule.stage !== stage) continue;
    if (!matchesXenesisNaturalConnectionAggregateRule(value, rule.matchKind)) continue;
    return buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible());
  }

  return null;
}
