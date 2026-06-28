import {
  buildXenesisNaturalLanguagePlan,
  findXenesisNaturalContextRule,
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
  presetId: (presetId: string) => ({ presetId }),
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

export const XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS = {
  settingsOpen: {
    id: 'natural-settings-open',
    path: 'xd.panes.settings.open',
    reason: 'Open settings from natural language request.',
  },
  diagnosticsOpen: {
    id: 'natural-diagnostics-open',
    path: 'xd.panes.diagnostics.open',
    reason: 'Open diagnostics from natural language request.',
  },
  capabilityExplorerOpen: {
    id: 'natural-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    reason: 'Open Capability Explorer from natural language request.',
  },
  captureList: {
    id: 'natural-capture-list',
    path: 'xd.capture.list',
    reason: 'List captures from natural language request.',
  },
  captureActivePane: {
    id: 'natural-capture-active-pane',
    path: 'xd.capture.activePane',
    reason: 'Capture the active pane from natural language request.',
  },
  dockFocusActive: {
    id: 'natural-dock-focus-active',
    path: 'xd.dock.focus',
    reason: 'Focus the active dock content from natural language request.',
  },
  dockCloseActive: {
    id: 'natural-dock-close-active',
    path: 'xd.dock.close',
    reason: 'Close the active dock content from natural language request.',
  },
  dockCloseRight: {
    id: 'natural-dock-close-right-active',
    path: 'xd.dock.closeRight',
    reason: 'Close tabs to the right of active dock content from natural language request.',
  },
  dockCloseOthers: {
    id: 'natural-dock-close-others-active',
    path: 'xd.dock.closeOthers',
    reason: 'Close other tabs around active dock content from natural language request.',
  },
  dockCloseAll: {
    id: 'natural-dock-close-all-active',
    path: 'xd.dock.closeAll',
    reason: 'Close all tabs in active dock pane from natural language request.',
  },
  dockSizeSet: {
    id: 'natural-dock-size-set',
    path: 'xd.dock.sizes.set',
    reason: 'Resize a dock side from natural language request.',
  },
  windowSizePreset: {
    id: 'natural-window-size-preset',
    path: 'xd.window.sizer.applyPreset',
    reason: 'Apply window size preset from natural language request.',
  },
  filesListOpen: {
    id: 'natural-files-list-open',
    path: 'xd.files.listOpen',
    reason: 'List open files from natural language request.',
  },
  fileOpen: {
    id: 'natural-file-open',
    path: 'xd.files.open',
    reason: 'Open file from natural language request.',
  },
  fileRead: {
    id: 'natural-file-read',
    path: 'xd.files.read',
    reason: 'Read file from natural language request.',
  },
  explorerHide: {
    id: 'natural-explorer-hide',
    path: 'xd.explorer.local.hide',
    reason: 'Hide explorer from natural language request.',
  },
  explorerToggle: {
    id: 'natural-explorer-toggle',
    path: 'xd.explorer.local.toggle',
    reason: 'Toggle explorer from natural language request.',
  },
  explorerRefresh: {
    id: 'natural-explorer-refresh',
    path: 'xd.explorer.local.refresh',
    reason: 'Refresh explorer from natural language request.',
  },
  explorerGoUp: {
    id: 'natural-explorer-go-up',
    path: 'xd.explorer.local.goUp',
    reason: 'Go to parent folder from natural language request.',
  },
  explorerFilter: {
    id: 'natural-explorer-filter',
    path: 'xd.explorer.local.setFilter',
    reason: 'Filter explorer from natural language request.',
  },
  explorerNavigate: {
    id: 'natural-explorer-navigate',
    path: 'xd.explorer.local.navigate',
    reason: 'Navigate explorer from natural language request.',
  },
  explorerShow: {
    id: 'natural-explorer-show',
    path: 'xd.explorer.local.show',
    reason: 'Show explorer from natural language request.',
  },
  favoritesShow: {
    id: 'natural-favorites-show',
    path: 'xd.favorites.showTab',
    reason: 'Show favorites from natural language request.',
  },
  terminalsList: {
    id: 'natural-terminals-list',
    path: 'xd.terminals.list',
    reason: 'List terminals from natural language request.',
  },
  terminalRunMany: {
    id: 'natural-terminal-run-many',
    path: 'xd.terminals.runMany',
    reason: 'Open multiple terminals from natural language request.',
  },
  terminalRun: {
    id: 'natural-terminal-run',
    path: 'xd.terminals.run',
    reason: 'Run terminal command from natural language request.',
  },
  dockWindowArrange: {
    id: 'natural-dock-window-arrange',
    path: 'xd.dock.window.arrange',
    reason: 'Arrange a Desk window area from natural language request.',
  },
  dockPaneArrange: {
    id: 'natural-dock-pane-arrange',
    path: 'xd.dock.pane.arrange',
    reason: 'Arrange the active dock pane from natural language request.',
  },
  dockArrangeGrid: {
    id: 'natural-dock-arrange-grid',
    path: 'xd.dock.arrangeGrid',
    reason: 'Arrange dock group as grid from natural language request.',
  },
  dockArrangeHorizontal: {
    id: 'natural-dock-arrange-horizontal',
    path: 'xd.dock.arrangeHorizontal',
    reason: 'Arrange dock group horizontally from natural language request.',
  },
  dockArrangeVertical: {
    id: 'natural-dock-arrange-vertical',
    path: 'xd.dock.arrangeVertical',
    reason: 'Arrange dock group vertically from natural language request.',
  },
  dockWindowMerge: {
    id: 'natural-dock-window-merge',
    path: 'xd.dock.window.merge',
    reason: 'Merge a Desk window area from natural language request.',
  },
  dockPaneMerge: {
    id: 'natural-dock-pane-merge',
    path: 'xd.dock.pane.merge',
    reason: 'Merge the active dock pane from natural language request.',
  },
  dockMergeGroup: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeGroup',
    reason: 'Merge dock layout from natural language request.',
  },
  dockMergeAll: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeAll',
    reason: 'Merge dock layout from natural language request.',
  },
  dockPanesList: {
    id: 'natural-dock-panes-list',
    path: 'xd.dock.panes.list',
    reason: 'List dock panes from natural language request.',
  },
  artifactTargetSet: {
    id: 'natural-artifact-target-set',
    path: 'xd.dock.artifactTarget.set',
    reason: 'Set active pane as artifact target from natural language request.',
  },
  appStatus: {
    id: 'natural-app-status',
    path: 'xd.app.status',
    reason: 'Read app status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_DESK_PANE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.settingsOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.settingsPaneOpen,
  },
  {
    contextWords: XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.diagnosticsOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.diagnosticsPaneOpen,
  },
  {
    contextWords: XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.capabilityExplorerOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.capabilityExplorerOpen,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_CAPTURE_RULES = [
  {
    contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.captureList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.captureListRead,
  },
  {
    contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.captureActivePane,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activePaneCapture,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_FILE_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.filesListOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.filesListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_FILE_PATH_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_OPEN_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.fileOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileOpen,
  },
  {
    contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.fileRead,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileContentRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_MISC_READ_RULES = [
  {
    contextWords: XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.favoritesShow,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.favoritesShow,
  },
  {
    contextWords: XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_APP_STATUS_TARGET_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.appStatus,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.appStatusRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockFocusActive,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockFocus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES = [
  {
    contextWords: XENESIS_NATURAL_RIGHT_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseRight,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_OTHER_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseOthers,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_ALL_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseAll,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseActive,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_SIZE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RESIZE_COMMAND_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockSizeSet,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockAreaResize,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES = [
  {
    contextWords: [],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.windowSizePreset,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_SIMPLE_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerHide,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerHide,
  },
  {
    contextWords: XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerToggle,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerToggle,
  },
  {
    contextWords: XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerRefresh,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerRefresh,
  },
  {
    contextWords: XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerGoUp,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerGoUp,
  },
  {
    contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerShow,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerShow,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_FILTER_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILTER_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerFilter,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerFilterApply,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerNavigate,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerNavigate,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalsList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_MANY_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalRunMany,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.multipleTerminalsOpenAndArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_RUN_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalRun,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalCommandRun,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockWindowArrange,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDeskAreaArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPaneArrange,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeGrid,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupTile,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeHorizontal,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupHorizontal,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeVertical,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupVertical,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockWindowMerge,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDockMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANE_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPaneMerge,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockMergeAll,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockMergeGroup,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANES_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPanesList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockPanesListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ARTIFACT_TARGET_RULES = [
  {
    contextWords: XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.artifactTargetSet,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.artifactTargetSet,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS = {
  localCliScan: {
    id: 'natural-local-cli-scan',
    path: 'xd.localCli.scan',
    reason: 'Scan local CLI agents from natural language request.',
  },
  mcpBridgeStatus: {
    id: 'natural-mcp-bridge-status',
    path: 'xd.mcp.bridge.status',
    reason: 'Read MCP bridge status from natural language request.',
  },
  mcpSettingsStatus: {
    id: 'natural-mcp-settings-status',
    path: 'xd.mcp.settings.status',
    reason: 'Read MCP settings status from natural language request.',
  },
  actionInboxList: {
    id: 'natural-mcp-action-inbox-list',
    path: 'xd.mcp.actionInbox.list',
    reason: 'List Action Inbox items from natural language request.',
  },
  gatewayDashboardOpen: {
    id: 'natural-xenesis-gateway-dashboard-open',
    path: 'xd.xenesis.gateway.openDashboard',
    reason: 'Open Xenesis gateway dashboard from natural language request.',
  },
  gatewayStatus: {
    id: 'natural-xenesis-gateway-status',
    path: 'xd.xenesis.gateway.status',
    reason: 'Read Xenesis gateway status from natural language request.',
  },
  agentEvents: {
    id: 'natural-xenesis-agent-events',
    path: 'xd.xenesis.agents.events',
    reason: 'List Xenesis Agent pane events from natural language request.',
  },
  agentStatus: {
    id: 'natural-xenesis-agent-status',
    path: 'xd.xenesis.agents.status',
    reason: 'Read Xenesis Agent pane status from natural language request.',
  },
  runtimeStatus: {
    id: 'natural-xenesis-status',
    path: 'xd.xenesis.status',
    reason: 'Read Xenesis runtime status from natural language request.',
  },
  reportsList: {
    id: 'natural-xenesis-reports-list',
    path: 'xd.xenesis.reports.list',
    reason: 'List Xenesis reports from natural language request.',
  },
  tasksList: {
    id: 'natural-xenesis-tasks-list',
    path: 'xd.xenesis.tasks.list',
    reason: 'List Xenesis tasks from natural language request.',
  },
  agentsList: {
    id: 'natural-xenesis-agents-list',
    path: 'xd.xenesis.agents.list',
    reason: 'List registered Xenesis Agent panes from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-diagnostics',
    path: 'xd.xenesis.diagnostics',
    reason: 'Read Xenesis operational diagnostics from natural language request.',
  },
  profilesList: {
    id: 'natural-xenesis-profiles-list',
    path: 'xd.xenesis.profiles.list',
    reason: 'List Xenesis profiles from natural language request.',
  },
  agentSubmit: {
    id: 'natural-xenesis-agent-submit',
    path: 'xd.xenesis.agents.submit',
    reason: 'Submit Xenesis Agent pane message from natural language request.',
  },
  runsStart: {
    id: 'natural-xenesis-runs-start',
    path: 'xd.xenesis.runs.start',
    reason: 'Start Xenesis run from natural language request.',
  },
  runsCancel: {
    id: 'natural-xenesis-runs-cancel',
    path: 'xd.xenesis.runs.cancel',
    reason: 'Cancel active Xenesis run from natural language request.',
  },
  sessionsReset: {
    id: 'natural-xenesis-sessions-reset',
    path: 'xd.xenesis.sessions.reset',
    reason: 'Reset active Xenesis session from natural language request.',
  },
  workspaceSet: {
    id: 'natural-xenesis-workspace-set',
    path: 'xd.xenesis.workspace.set',
    reason: 'Set Xenesis workspace from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS = {
  actionInboxList: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.actionInboxList.path,
} as const;

export const XENESIS_NATURAL_AGENT_READBACK_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentEvents,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentStatus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_AGENT_SUBMIT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentSubmit,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUN_START_RULES = [
  {
    contextWords: XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUN_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runsStart,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_WORKSPACE_SET_RULES = [
  {
    contextWords: XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.workspaceSet,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_SUPPORT_RULES = [
  {
    contextWords: XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.localCliScan,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.mcpBridgeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.mcpSettingsStatus,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_INBOX_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.actionInboxList,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_GATEWAY_ACTION_RULES = [
  {
    contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayDashboardOpen,
  },
  {
    contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayStatus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_INVENTORY_RULES = [
  {
    contextWords: XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runtimeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runtimeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.reportsList,
  },
  {
    contextWords: XENESIS_NATURAL_TASK_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.tasksList,
  },
  {
    contextWords: XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentsList,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.diagnostics,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROFILE_INVENTORY_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_PROFILE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.profilesList,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_CONTROL_RULES = [
  {
    contextWords: XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runsCancel,
  },
  {
    contextWords: XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.sessionsReset,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS = {
  open: {
    path: 'xd.xenesis.guides.open',
    idFor: (id: string, _label: string, _openFile: boolean) => `natural-xenesis-guide-open-${id}`,
    reasonFor: (_id: string, label: string, openFile: boolean) =>
      `Open ${label} guide${openFile ? ' file' : ''} from natural language request.`,
  },
  status: {
    path: 'xd.xenesis.guides.status',
    idFor: (id: string, _label: string) => `natural-xenesis-guide-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} guide catalog status from natural language request.`,
  },
} as const satisfies {
  open: XenesisNaturalDeskActionTemplateDescriptor<[string, string, boolean]>;
  status: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
};

export const XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS = {
  centerOpen: {
    id: 'natural-xenesis-onboarding-center-open',
    path: 'xd.xenesis.onboarding.open',
    reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
  },
  stepOpen: {
    path: 'xd.xenesis.onboarding.open',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} onboarding checklist step from natural language request.`,
  },
  stepStatus: {
    path: 'xd.xenesis.onboarding.status',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} onboarding checklist status from natural language request.`,
  },
} as const satisfies {
  centerOpen: XenesisNaturalDeskActionDescriptor;
  stepOpen: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  stepStatus: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
};

export const XENESIS_NATURAL_GUIDE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.open,
  },
] as const satisfies readonly XenesisNaturalGuideOpenRule[];

export const XENESIS_NATURAL_GUIDE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.status,
  },
] as const satisfies readonly XenesisNaturalGuideStatusRule[];

export const XENESIS_NATURAL_ONBOARDING_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.stepOpen,
    argsKind: 'targetIdVisible',
    targetRequired: true,
  },
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.centerOpen,
    argsKind: 'ensureVisible',
    targetRequired: false,
  },
] as const satisfies readonly XenesisNaturalOnboardingActionRule[];

export const XENESIS_NATURAL_ONBOARDING_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.stepStatus,
    argsKind: 'targetId',
    targetRequired: true,
  },
] as const satisfies readonly XenesisNaturalOnboardingActionRule[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  guides: {
    id: 'natural-xenesis-guides-catalog-open',
    path: 'xd.xenesis.guides.open',
    reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-connection-diagnostics-catalog-open',
    path: 'xd.xenesis.connections.diagnostics.open',
    reason: 'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
  },
  setupRequests: {
    id: 'natural-xenesis-connection-setup-requests-catalog-open',
    path: 'xd.xenesis.connections.setupRequests.open',
    reason: 'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
  },
  connections: {
    id: 'natural-xenesis-connections-center-open',
    path: 'xd.xenesis.connections.open',
    reason: 'Open Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES = [
  {
    stage: 'guide',
    matchKind: 'guideCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'late',
    matchKind: 'diagnosticsCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.diagnostics,
  },
  {
    stage: 'late',
    matchKind: 'setupRequestCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setupRequests,
  },
  {
    stage: 'late',
    matchKind: 'connectionCenterOpen',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.connections,
  },
] as const satisfies readonly XenesisNaturalConnectionAggregateOpenRule[];

export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  connectors: {
    id: 'natural-xenesis-tools-connectors-catalog-open',
    path: 'xd.xenesis.tools.connectors.open',
    reason: 'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
  },
  mcpInstallDrafts: {
    id: 'natural-xenesis-tools-mcp-install-drafts-catalog-open',
    path: 'xd.xenesis.tools.mcpInstallDrafts.open',
    reason: 'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
  },
  oauthDrafts: {
    id: 'natural-xenesis-tools-oauth-drafts-catalog-open',
    path: 'xd.xenesis.tools.oauthDrafts.open',
    reason: 'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-tools-views-catalog-open',
    path: 'xd.xenesis.tools.views.open',
    reason: 'Open external tool view catalog in Xenesis Connection Center from natural language request.',
  },
  installPlans: {
    id: 'natural-xenesis-tools-install-plans-catalog-open',
    path: 'xd.xenesis.tools.installPlans.open',
    reason: 'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
  },
  setupPlans: {
    id: 'natural-xenesis-tools-setup-plans-catalog-open',
    path: 'xd.xenesis.tools.setupPlans.open',
    reason: 'Open external tool setup plan catalog in Xenesis Connection Center from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-tools-setup-catalog-open',
    path: 'xd.xenesis.tools.setup.open',
    reason: 'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
  },
  actions: {
    id: 'natural-xenesis-tools-actions-catalog-open',
    path: 'xd.xenesis.tools.actions.open',
    reason: 'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-tools-user-stories-catalog-open',
    path: 'xd.xenesis.tools.userStories.open',
    reason: 'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-tool-catalog-open',
    path: 'xd.xenesis.tools.setup.open',
    reason: 'Open external tool catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.connectors,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.mcpInstallDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.oauthDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.installPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setupPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.actions,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  profileDrafts: {
    id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
    path: 'xd.xenesis.channels.profileDrafts.open',
    reason: 'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
  },
  routing: {
    id: 'natural-xenesis-messengers-routing-catalog-open',
    path: 'xd.xenesis.channels.routing.open',
    reason: 'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
  },
  safety: {
    id: 'natural-xenesis-messengers-safety-catalog-open',
    path: 'xd.xenesis.channels.safety.open',
    reason: 'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
  },
  accessGroups: {
    id: 'natural-xenesis-messengers-access-groups-catalog-open',
    path: 'xd.xenesis.channels.accessGroups.open',
    reason: 'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
  },
  pairing: {
    id: 'natural-xenesis-messengers-pairing-catalog-open',
    path: 'xd.xenesis.channels.pairing.open',
    reason: 'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-messengers-user-stories-catalog-open',
    path: 'xd.xenesis.channels.userStories.open',
    reason: 'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
  },
  setupPlans: {
    id: 'natural-xenesis-messengers-setup-plans-catalog-open',
    path: 'xd.xenesis.channels.setupPlans.open',
    reason: 'Open external messenger setup plan catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-messengers-views-catalog-open',
    path: 'xd.xenesis.messengers.views.open',
    reason: 'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-messenger-catalog-open',
    path: 'xd.xenesis.messengers.views.open',
    reason: 'Open external messenger catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.safety,
  },
  {
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.accessGroups,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.pairing,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setupPlans,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  routing: {
    id: 'natural-xenesis-providers-routing-catalog-open',
    path: 'xd.xenesis.providers.routing.open',
    reason: 'Open AI provider routing in Xenesis Connection Center from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-providers-setup-catalog-open',
    path: 'xd.xenesis.providers.setup.open',
    reason: 'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-providers-views-catalog-open',
    path: 'xd.xenesis.providers.views.open',
    reason: 'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
  },
  profileDrafts: {
    id: 'natural-xenesis-providers-profile-drafts-catalog-open',
    path: 'xd.xenesis.providers.profileDrafts.open',
    reason: 'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-provider-catalog-open',
    path: 'xd.xenesis.providers.setup.open',
    reason: 'Open AI provider catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  connectors: {
    id: 'natural-xenesis-tools-connectors-status',
    path: 'xd.xenesis.tools.connectors.status',
    reason: 'Read external tool connector catalog status from natural language request.',
  },
  mcpInstallDrafts: {
    id: 'natural-xenesis-tools-mcp-install-drafts-status',
    path: 'xd.xenesis.tools.mcpInstallDrafts.status',
    reason: 'Read external tool MCP install draft catalog status from natural language request.',
  },
  oauthDrafts: {
    id: 'natural-xenesis-tools-oauth-drafts-status',
    path: 'xd.xenesis.tools.oauthDrafts.status',
    reason: 'Read external tool OAuth draft catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-tools-views-status',
    path: 'xd.xenesis.tools.views.status',
    reason: 'Read external tool view catalog status from natural language request.',
  },
  installPlans: {
    id: 'natural-xenesis-tools-install-plans-status',
    path: 'xd.xenesis.tools.installPlans.status',
    reason: 'Read external tool install plan catalog status from natural language request.',
  },
  setupPlans: {
    id: 'natural-xenesis-tools-setup-plans-status',
    path: 'xd.xenesis.tools.setupPlans.status',
    reason: 'Read external tool setup plan catalog status from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-tools-setup-status',
    path: 'xd.xenesis.tools.setup.status',
    reason: 'Read external tool setup catalog status from natural language request.',
  },
  actions: {
    id: 'natural-xenesis-tools-actions-status',
    path: 'xd.xenesis.tools.actions.status',
    reason: 'Read external tool action policy catalog status from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-tools-user-stories-status',
    path: 'xd.xenesis.tools.userStories.status',
    reason: 'Read external tool user-story catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.connectors,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.mcpInstallDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.oauthDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.installPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setupPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.actions,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.userStories,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  profileDrafts: {
    id: 'natural-xenesis-messengers-profile-drafts-status',
    path: 'xd.xenesis.channels.profileDrafts.status',
    reason: 'Read external messenger profile draft catalog status from natural language request.',
  },
  routing: {
    id: 'natural-xenesis-messengers-routing-status',
    path: 'xd.xenesis.channels.routing.status',
    reason: 'Read external messenger routing catalog status from natural language request.',
  },
  safety: {
    id: 'natural-xenesis-messengers-safety-status',
    path: 'xd.xenesis.channels.safety.status',
    reason: 'Read external messenger safety catalog status from natural language request.',
  },
  accessGroups: {
    id: 'natural-xenesis-messengers-access-groups-status',
    path: 'xd.xenesis.channels.accessGroups.status',
    reason: 'Read external messenger access-group catalog status from natural language request.',
  },
  pairing: {
    id: 'natural-xenesis-messengers-pairing-status',
    path: 'xd.xenesis.channels.pairing.status',
    reason: 'Read external messenger pairing catalog status from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-messengers-user-stories-status',
    path: 'xd.xenesis.channels.userStories.status',
    reason: 'Read external messenger user-story catalog status from natural language request.',
  },
  setupPlans: {
    id: 'natural-xenesis-messengers-setup-plans-status',
    path: 'xd.xenesis.channels.setupPlans.status',
    reason: 'Read external messenger setup plan catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-messengers-views-status',
    path: 'xd.xenesis.messengers.views.status',
    reason: 'Read external messenger view catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.safety,
  },
  {
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.accessGroups,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.pairing,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setupPlans,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  routing: {
    id: 'natural-xenesis-providers-routing-status',
    path: 'xd.xenesis.providers.routing.status',
    reason: 'Read AI provider routing catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-providers-views-status',
    path: 'xd.xenesis.providers.views.status',
    reason: 'Read AI provider view catalog status from natural language request.',
  },
  profileDrafts: {
    id: 'natural-xenesis-providers-profile-drafts-status',
    path: 'xd.xenesis.providers.profileDrafts.status',
    reason: 'Read AI provider profile draft catalog status from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-providers-setup-status',
    path: 'xd.xenesis.providers.setup.status',
    reason: 'Read AI provider setup catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setup,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  guides: {
    id: 'natural-xenesis-guides-status',
    path: 'xd.xenesis.guides.status',
    reason: 'Read Xenesis guide catalog status from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-connection-diagnostics-status',
    path: 'xd.xenesis.connections.diagnostics.status',
    reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
  },
  setupRequests: {
    id: 'natural-xenesis-connection-setup-requests-status',
    path: 'xd.xenesis.connections.setupRequests.status',
    reason: 'Read Xenesis connection setup request catalog from natural language request.',
  },
  onboarding: {
    id: 'natural-xenesis-onboarding-status',
    path: 'xd.xenesis.onboarding.status',
    reason: 'Read Xenesis onboarding status from natural language request.',
  },
  connections: {
    id: 'natural-xenesis-connections-status',
    path: 'xd.xenesis.connections.status',
    reason: 'Read Xenesis connection status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES = [
  {
    stage: 'early',
    matchKind: 'guideCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'early',
    matchKind: 'diagnosticsCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.diagnostics,
  },
  {
    stage: 'early',
    matchKind: 'setupRequestCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setupRequests,
  },
  {
    stage: 'late',
    matchKind: 'onboarding',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.onboarding,
  },
  {
    stage: 'late',
    matchKind: 'guideContext',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'late',
    matchKind: 'connectionContext',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.connections,
  },
] as const satisfies readonly XenesisNaturalConnectionAggregateStatusRule[];

export const XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS = {
  routing: {
    path: 'xd.xenesis.providers.routing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-routing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider routing from natural language request.`,
  },
  profileDrafts: {
    path: 'xd.xenesis.providers.profileDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider profile draft from natural language request.`,
  },
  views: {
    path: 'xd.xenesis.providers.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider view from natural language request.`,
  },
  setup: {
    path: 'xd.xenesis.providers.setup.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-setup-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider setup from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS = {
  routing: {
    path: 'xd.xenesis.providers.routing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-routing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider routing status from natural language request.`,
  },
  views: {
    path: 'xd.xenesis.providers.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider view status from natural language request.`,
  },
  profileDrafts: {
    path: 'xd.xenesis.providers.profileDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} provider profile draft status from natural language request.`,
  },
  setup: {
    path: 'xd.xenesis.providers.setup.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-setup-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider setup status from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_PROVIDER_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.routing,
    argsKind: 'provider',
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.views,
    argsKind: 'provider',
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.profileDrafts,
    argsKind: 'provider',
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.setup,
    argsKind: 'provider',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_PROVIDER_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.routing,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.profileDrafts,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.views,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.setup,
    argsKind: 'providerVisible',
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS = {
  diagnostics: {
    path: 'xd.xenesis.connections.diagnostics.status',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-diagnostics-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} connection diagnostics from natural language request.`,
  },
  setupRequest: {
    path: 'xd.xenesis.connections.setupRequests.status',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} connection setup request status from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} MCP install draft status from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} OAuth draft status from natural language request.`,
  },
  toolOauthSetupPacket: {
    path: 'xd.xenesis.tools.oauthDrafts.setupPacket',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-setup-packet-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} OAuth setup packet from natural language request.`,
  },
  toolUserStory: {
    path: 'xd.xenesis.tools.userStories.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-user-story-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool user story status from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool action policy status from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool install plan status from natural language request.`,
  },
  toolSetupPlan: {
    path: 'xd.xenesis.tools.setupPlans.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-plan-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool setup plan status from natural language request.`,
  },
  toolSetup: {
    path: 'xd.xenesis.tools.setup.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool setup status from natural language request.`,
  },
  toolConnector: {
    path: 'xd.xenesis.tools.connectors.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-connector-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool connector status from natural language request.`,
  },
  toolView: {
    path: 'xd.xenesis.tools.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool view status from natural language request.`,
  },
  channelRouting: {
    path: 'xd.xenesis.channels.routing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-routing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel routing status from natural language request.`,
  },
  channelSafety: {
    path: 'xd.xenesis.channels.safety.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-safety-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel safety status from natural language request.`,
  },
  channelAccessGroups: {
    path: 'xd.xenesis.channels.accessGroups.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-access-groups-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} channel access groups status from natural language request.`,
  },
  channelPairing: {
    path: 'xd.xenesis.channels.pairing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-pairing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel pairing status from natural language request.`,
  },
  channelUserStory: {
    path: 'xd.xenesis.channels.userStories.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-user-story-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel user story status from natural language request.`,
  },
  channelSetupPlan: {
    path: 'xd.xenesis.channels.setupPlans.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-setup-plan-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel setup plan status from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} channel profile draft status from natural language request.`,
  },
  messengerView: {
    path: 'xd.xenesis.messengers.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-messenger-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} messenger view status from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES = [
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetId',
  },
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.setupRequest,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'tool',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolUserStory,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolSetupPlan,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolSetup,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolConnector,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolView,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelRouting,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelSafety,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelAccessGroups,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelPairing,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelUserStory,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelSetupPlan,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.messengerView,
    argsKind: 'targetId',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetId',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULES = [
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_SETUP_PACKET_CONTEXT_WORDS,
    requiredContextWordGroups: [['패킷', 'packet', 'redirect uri', '리디렉션']],
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolOauthSetupPacket,
    argsKind: 'targetId',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS = {
  diagnostics: {
    path: 'xd.xenesis.connections.diagnostics.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-diagnostics-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection diagnostics from natural language request.`,
  },
  setupRequest: {
    path: 'xd.xenesis.connections.setupRequests.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection setup request from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} OAuth draft from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} MCP install draft from natural language request.`,
  },
  toolUserStory: {
    path: 'xd.xenesis.tools.userStories.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-user-story-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool user story from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool action policy from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool install plan from natural language request.`,
  },
  toolSetupPlan: {
    path: 'xd.xenesis.tools.setupPlans.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-plan-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool setup plan from natural language request.`,
  },
  toolConnector: {
    path: 'xd.xenesis.tools.connectors.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-connector-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool connector from natural language request.`,
  },
  toolSetup: {
    path: 'xd.xenesis.tools.setup.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool setup from natural language request.`,
  },
  toolView: {
    path: 'xd.xenesis.tools.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool view from natural language request.`,
  },
  channelUserStory: {
    path: 'xd.xenesis.channels.userStories.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-user-story-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel user story from natural language request.`,
  },
  channelSetupPlan: {
    path: 'xd.xenesis.channels.setupPlans.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-setup-plan-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel setup plan from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel profile draft from natural language request.`,
  },
  channelRouting: {
    path: 'xd.xenesis.channels.routing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-routing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel routing from natural language request.`,
  },
  channelSafety: {
    path: 'xd.xenesis.channels.safety.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-safety-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel safety from natural language request.`,
  },
  channelAccessGroups: {
    path: 'xd.xenesis.channels.accessGroups.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-access-groups-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel access groups from natural language request.`,
  },
  channelPairing: {
    path: 'xd.xenesis.channels.pairing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-pairing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel pairing from natural language request.`,
  },
  messengerView: {
    path: 'xd.xenesis.messengers.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-messenger-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} messenger view from natural language request.`,
  },
  connectionCard: {
    path: 'xd.xenesis.connections.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection card from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES = [
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.setupRequest,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolUserStory,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolSetupPlan,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolConnector,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolSetup,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolView,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelUserStory,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SETUP_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelSetupPlan,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelRouting,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelSafety,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelAccessGroups,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelPairing,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.messengerView,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.connectionCard,
    argsKind: 'targetIdVisible',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_ACTION_DESCRIPTORS = {
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-apply-${id}`,
    reasonFor: (_id: string, label: string) => `Apply ${label} MCP install draft from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_TARGET_RULES = [
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS],
    action: XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'mcpInstallApply',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS = {
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.apply',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-apply-${id}`,
    reasonFor: (_id: string, label: string) => `Apply ${label} channel profile draft from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_TARGET_RULES = [
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS],
    action: XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channel',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_CHANNEL_TEST_ACTION_DESCRIPTORS = {
  channelTest: {
    path: 'xd.xenesis.profiles.testChannel',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-test-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Send a sanitized ${label} channel test message from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CHANNEL_TEST_TARGET_RULES = [
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_CHANNEL_TEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CHANNEL_TEST_ACTION_DESCRIPTORS.channelTest,
    argsKind: 'channel',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS = {
  providerProfileDraft: {
    path: 'xd.xenesis.providers.profileDrafts.apply',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-apply-${id}`,
    reasonFor: (id: string, label: string) =>
      id === 'auto'
        ? 'Apply AI provider profile draft from natural language request.'
        : `Apply ${label} provider profile draft from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_PROVIDER_RULES = [
  {
    contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_ACTION_DESCRIPTORS.providerProfileDraft,
    argsKind: 'provider',
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_CONNECTION_SETUP_APPLY_ACTION_DESCRIPTORS = {
  connectionSetupRequest: {
    path: 'xd.xenesis.connections.setupRequests.apply',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-apply-${id}`,
    reasonFor: (_id: string, label: string) => `Apply ${label} connection setup request from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CONNECTION_SETUP_APPLY_TARGET_RULES = [
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_APPLY_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_SETUP_CONTEXT_WORDS],
    action: XENESIS_NATURAL_CONNECTION_SETUP_APPLY_ACTION_DESCRIPTORS.connectionSetupRequest,
    argsKind: 'mcpInstallApply',
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS = {
  providerProfileDraft: {
    path: 'xd.xenesis.providers.profileDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-request-${id}`,
    reasonFor: (id: string, label: string) =>
      id === 'auto'
        ? 'Request AI provider profile draft review from natural language request.'
        : `Request ${label} provider profile draft review from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool install plan review from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} MCP install draft review from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-request-${id}`,
    reasonFor: (_id: string, label: string) => `Request ${label} OAuth draft review from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool action policy review from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} channel profile draft review from natural language request.`,
  },
  connectionSetupRequest: {
    path: 'xd.xenesis.connections.setupRequests.request',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} connection setup review from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES = [
  {
    contextWords: [],
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.providerProfileDraft,
    argsKind: 'provider',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES = [
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channel',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.connectionSetupRequest,
    argsKind: 'targetId',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

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
