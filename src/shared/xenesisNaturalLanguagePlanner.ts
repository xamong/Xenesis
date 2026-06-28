import {
  localCliMcpReadbackActionFromNaturalText,
  toolOpenActionFromNaturalText,
  viewKindFromNaturalText,
  xenesisAgentSubmitActionFromNaturalText,
  xenesisConnectionActionFromNaturalText,
  xenesisConnectionReadbackActionFromNaturalText,
  xenesisConnectionReviewRequestActionFromNaturalText,
  xenesisGatewayActionFromNaturalText,
  xenesisProfileInventoryActionFromNaturalText,
  xenesisRunStartActionFromNaturalText,
  xenesisRuntimeControlActionFromNaturalText,
  xenesisRuntimeInventoryActionFromNaturalText,
  xenesisWorkspaceSetActionFromNaturalText,
} from './xenesisNaturalLanguageActionResolvers';
import {
  buildXenesisNaturalCatalogAction,
  buildXenesisNaturalLanguagePlan,
  buildXenesisNaturalViewOpenAction,
  detectXenesisNaturalArrangeMode,
  detectXenesisNaturalDockSide,
  detectXenesisNaturalDockWindowState,
  detectXenesisNaturalPlacement,
  detectXenesisNaturalWindowSizePreset,
  emptyXenesisNaturalLanguagePlan,
  extractXenesisNaturalDockSize,
  extractXenesisNaturalFilterQuery,
  extractXenesisNaturalLocalPath,
  extractXenesisNaturalTerminalCommand,
  extractXenesisNaturalTerminalCount,
  findXenesisNaturalCatalogRule,
  findXenesisNaturalCatalogRulePlan,
  hasXenesisNaturalActionIntent,
  matchesXenesisNaturalContextRules,
  normalizeXenesisNaturalLanguageText,
  XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
  XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
  XENESIS_NATURAL_DESK_ACTION_ARGS,
  XENESIS_NATURAL_DESK_CAPTURE_RULES,
  XENESIS_NATURAL_DESK_FILE_LIST_RULES,
  XENESIS_NATURAL_DESK_FILE_PATH_RULES,
  XENESIS_NATURAL_DESK_MISC_READ_RULES,
  XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
  XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES,
  XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES,
  XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES,
  XENESIS_NATURAL_DOCK_PANE_MERGE_RULES,
  XENESIS_NATURAL_DOCK_PANES_LIST_RULES,
  XENESIS_NATURAL_DOCK_SIZE_RULES,
  XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES,
  XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES,
  XENESIS_NATURAL_EXPLORER_FILTER_RULES,
  XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES,
  XENESIS_NATURAL_EXPLORER_SIMPLE_RULES,
  XENESIS_NATURAL_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_OPEN_OR_SHOW_RULES,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalLanguagePlan,
} from './xenesisNaturalLanguageCatalog';

export type XenesisDeskActionRequest = XenesisNaturalDeskActionRequest;
export type XenesisDeskNaturalLanguagePlan = XenesisNaturalLanguagePlan;

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || XENESIS_NATURAL_TEXT_DEFAULTS.empty).trim();
  const value = normalizeXenesisNaturalLanguageText(rawText);
  if (!value || !hasXenesisNaturalActionIntent(value)) return emptyXenesisNaturalLanguagePlan();

  const placement = detectXenesisNaturalPlacement(value);

  const xenesisAgentSubmitAction = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (xenesisAgentSubmitAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.agentSubmitRecorded, [
      xenesisAgentSubmitAction,
    ]);
  }

  const xenesisRunStartAction = xenesisRunStartActionFromNaturalText(rawText);
  if (xenesisRunStartAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runStartRecorded, [xenesisRunStartAction]);
  }

  const xenesisWorkspaceSetAction = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (xenesisWorkspaceSetAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.workspaceSetRecorded, [
      xenesisWorkspaceSetAction,
    ]);
  }

  const xenesisConnectionReviewRequestAction = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (xenesisConnectionReviewRequestAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionReviewRequestRecorded, [
      xenesisConnectionReviewRequestAction,
    ]);
  }

  const explicitXenesisConnectionOpenAction = xenesisConnectionActionFromNaturalText(value);
  if (
    explicitXenesisConnectionOpenAction &&
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_COMMAND_RULES)
  ) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [
      explicitXenesisConnectionOpenAction,
    ]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionStatusRead, [
      xenesisConnectionReadbackAction,
    ]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [
      xenesisConnectionAction,
    ]);
  }

  const localCliMcpReadbackAction = localCliMcpReadbackActionFromNaturalText(value);
  if (localCliMcpReadbackAction) {
    if (localCliMcpReadbackAction.path === XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList) {
      return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.actionInboxListRead, [
        localCliMcpReadbackAction,
      ]);
    }
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.localCliMcpStatusRead, [
      localCliMcpReadbackAction,
    ]);
  }

  const xenesisGatewayAction = xenesisGatewayActionFromNaturalText(value);
  if (xenesisGatewayAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.gatewayStatusOrOpen, [
      xenesisGatewayAction,
    ]);
  }

  const xenesisRuntimeInventoryAction = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (xenesisRuntimeInventoryAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeInventoryRead, [
      xenesisRuntimeInventoryAction,
    ]);
  }

  const xenesisProfileInventoryAction = xenesisProfileInventoryActionFromNaturalText(value);
  if (xenesisProfileInventoryAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.profileInventoryRead, [
      xenesisProfileInventoryAction,
    ]);
  }

  const xenesisRuntimeControlAction = xenesisRuntimeControlActionFromNaturalText(value);
  if (xenesisRuntimeControlAction) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeControlRecorded, [
      xenesisRuntimeControlAction,
    ]);
  }

  const deskPaneOpenPlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.placement(placement),
  );
  if (deskPaneOpenPlan) return deskPaneOpenPlan;

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedToolPanelOpen, [toolOpenAction]);
  }

  const deskCapturePlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_CAPTURE_RULES);
  if (deskCapturePlan) return deskCapturePlan;

  const activeDockFocusPlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockFocusPlan) return activeDockFocusPlan;

  const activeDockClosePlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockClosePlan) return activeDockClosePlan;

  const dockSide = detectXenesisNaturalDockSide(value);
  const dockSize = extractXenesisNaturalDockSize(value);
  const dockSizeRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_SIZE_RULES);
  if (dockSizeRule?.visibleText && dockSide && dockSize) {
    return buildXenesisNaturalLanguagePlan(dockSizeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        dockSizeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockSize(dockSide, dockSize),
      ),
    ]);
  }

  const presetId = detectXenesisNaturalWindowSizePreset(value);
  const windowSizeRule = presetId
    ? findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES)
    : null;
  if (presetId && windowSizeRule) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.windowSizePreset(presetId), [
      buildXenesisNaturalCatalogAction(windowSizeRule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.presetId(presetId)),
    ]);
  }

  const deskFileListPlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_FILE_LIST_RULES);
  if (deskFileListPlan) return deskFileListPlan;

  const filePath = extractXenesisNaturalLocalPath(rawText);
  const deskFilePathPlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DESK_FILE_PATH_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.optionalFilePath(filePath),
  );
  if (deskFilePathPlan) return deskFilePathPlan;

  const explorerFilterRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_EXPLORER_FILTER_RULES);
  if (explorerFilterRule?.visibleText) {
    const query = extractXenesisNaturalFilterQuery(rawText);
    return buildXenesisNaturalLanguagePlan(explorerFilterRule.visibleText, [
      buildXenesisNaturalCatalogAction(explorerFilterRule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.filterQuery(query)),
    ]);
  }

  const explorerPath = extractXenesisNaturalLocalPath(rawText);
  const explorerNavigateRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES);
  if (explorerNavigateRule?.visibleText && explorerPath) {
    return buildXenesisNaturalLanguagePlan(explorerNavigateRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        explorerNavigateRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.explorerPath(explorerPath),
      ),
    ]);
  }

  const explorerSimplePlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_EXPLORER_SIMPLE_RULES);
  if (explorerSimplePlan) return explorerSimplePlan;

  const deskMiscReadPlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_MISC_READ_RULES);
  if (deskMiscReadPlan) return deskMiscReadPlan;

  const terminalListPlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_TERMINAL_LIST_RULES);
  if (terminalListPlan) return terminalListPlan;

  const count = extractXenesisNaturalTerminalCount(value);
  const terminalManyRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_TERMINAL_MANY_RULES);
  if (terminalManyRule?.visibleText && count && count > 1) {
    const actions = [
      buildXenesisNaturalCatalogAction(
        terminalManyRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.terminalMany(count, placement),
      ),
    ];
    const arrangeMode = detectXenesisNaturalArrangeMode(value);
    const terminalArrangeRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
    if (arrangeMode && terminalArrangeRule) {
      actions.push(
        buildXenesisNaturalCatalogAction(
          terminalArrangeRule.action,
          XENESIS_NATURAL_DESK_ACTION_ARGS.dockWindowArrange(detectXenesisNaturalDockWindowState(value), arrangeMode),
        ),
      );
    }
    return buildXenesisNaturalLanguagePlan(terminalManyRule.visibleText, actions);
  }

  const terminalRunRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_TERMINAL_RUN_RULES);
  if (terminalRunRule?.visibleText) {
    const command = extractXenesisNaturalTerminalCommand(rawText);
    return buildXenesisNaturalLanguagePlan(terminalRunRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        terminalRunRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.terminalRun(command, placement),
      ),
    ]);
  }

  const scopedArrangeMode = detectXenesisNaturalArrangeMode(value);
  const windowState = detectXenesisNaturalDockWindowState(value);
  const windowArrangeRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
  if (scopedArrangeMode && windowState && windowArrangeRule?.visibleText) {
    return buildXenesisNaturalLanguagePlan(windowArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        windowArrangeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
      ),
    ]);
  }

  const paneArrangeRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES);
  if (scopedArrangeMode && paneArrangeRule?.visibleText) {
    return buildXenesisNaturalLanguagePlan(paneArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        paneArrangeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode),
      ),
    ]);
  }

  const dockGroupArrangePlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES);
  if (dockGroupArrangePlan) return dockGroupArrangePlan;

  const dockWindowMergeRule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES);
  if (windowState && dockWindowMergeRule?.visibleText) {
    return buildXenesisNaturalLanguagePlan(dockWindowMergeRule.visibleText, [
      buildXenesisNaturalCatalogAction(dockWindowMergeRule.action, { windowState }),
    ]);
  }

  const dockPaneMergePlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DOCK_PANE_MERGE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (dockPaneMergePlan) return dockPaneMergePlan;

  const dockGroupMergePlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES);
  if (dockGroupMergePlan) return dockGroupMergePlan;

  const dockPanesListPlan = findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_PANES_LIST_RULES);
  if (dockPanesListPlan) return dockPanesListPlan;

  const artifactTargetPlan = findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (artifactTargetPlan) return artifactTargetPlan;

  const view = viewKindFromNaturalText(value);
  if (view && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES)) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedViewOpen, [
      buildXenesisNaturalViewOpenAction(view, placement),
    ]);
  }

  return emptyXenesisNaturalLanguagePlan();
}
