import {
  localCliMcpReadbackActionFromNaturalText,
  toolOpenActionFromNaturalText,
  viewKindFromNaturalText,
  xenesisAgentSubmitActionFromNaturalText,
  xenesisConnectionActionFromNaturalText,
  xenesisConnectionMcpInstallDraftApplyActionFromNaturalText,
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
  buildXenesisNaturalViewOpenAction,
  findXenesisNaturalCatalogRule,
  findXenesisNaturalCatalogRulePlan,
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
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
} from './xenesisNaturalLanguageCapabilityCatalog';
import {
  buildXenesisNaturalLanguagePlan,
  detectXenesisNaturalArrangeMode,
  detectXenesisNaturalDockSide,
  detectXenesisNaturalDockWindowState,
  detectXenesisNaturalWindowSizePreset,
  extractXenesisNaturalDockSize,
  extractXenesisNaturalFilterQuery,
  extractXenesisNaturalLocalPath,
  extractXenesisNaturalTerminalCommand,
  extractXenesisNaturalTerminalCount,
  matchesXenesisNaturalContextRules,
  XENESIS_NATURAL_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_OPEN_OR_SHOW_RULES,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalLanguagePlan,
} from './xenesisNaturalLanguageCatalog';

export function xenesisAgentSubmitPlanFromNaturalText(rawText: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.agentSubmitRecorded, [action]);
}

export function xenesisRunStartPlanFromNaturalText(rawText: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisRunStartActionFromNaturalText(rawText);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runStartRecorded, [action]);
}

export function xenesisWorkspaceSetPlanFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalLanguagePlan | null {
  const action = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.workspaceSetRecorded, [action]);
}

export function xenesisConnectionReviewRequestPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionReviewRequestRecorded, [action]);
}

export function xenesisConnectionMcpInstallDraftApplyPlanFromNaturalText(
  value: string,
): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionMcpInstallDraftApplyActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionMcpInstallDraftApplyRecorded, [
    action,
  ]);
}

export function explicitXenesisConnectionOpenPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionActionFromNaturalText(value);
  if (!action || !matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_COMMAND_RULES)) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [action]);
}

export function xenesisConnectionReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionReadbackActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionStatusRead, [action]);
}

export function xenesisConnectionOpenOrShowPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionActionFromNaturalText(value);
  if (!action || !matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [action]);
}

export function localCliMcpReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = localCliMcpReadbackActionFromNaturalText(value);
  if (!action) return null;
  if (action.path === XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList) {
    return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.actionInboxListRead, [action]);
  }
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.localCliMcpStatusRead, [action]);
}

export function xenesisGatewayPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisGatewayActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.gatewayStatusOrOpen, [action]);
}

export function xenesisRuntimeInventoryPlanFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalLanguagePlan | null {
  const action = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeInventoryRead, [action]);
}

export function xenesisProfileInventoryPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisProfileInventoryActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.profileInventoryRead, [action]);
}

export function xenesisRuntimeControlPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisRuntimeControlActionFromNaturalText(value);
  if (!action) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeControlRecorded, [action]);
}

export function deskPaneOpenPlanFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.placement(placement),
  );
}

export function toolOpenPlanFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  const action = toolOpenActionFromNaturalText(value, placement);
  if (!action || !matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedToolPanelOpen, [action]);
}

export function deskCapturePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_CAPTURE_RULES);
}

export function activeDockFocusPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
}

export function activeDockClosePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
}

export function dockSizePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const dockSide = detectXenesisNaturalDockSide(value);
  const dockSize = extractXenesisNaturalDockSize(value);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_SIZE_RULES);
  if (!rule?.visibleText || !dockSide || !dockSize) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.dockSize(dockSide, dockSize)),
  ]);
}

export function windowSizePresetPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const presetId = detectXenesisNaturalWindowSizePreset(value);
  const rule = presetId ? findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES) : null;
  if (!presetId || !rule) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.windowSizePreset(presetId), [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.presetId(presetId)),
  ]);
}

export function deskFileListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_FILE_LIST_RULES);
}

export function deskFilePathPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null {
  const filePath = extractXenesisNaturalLocalPath(rawText);
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DESK_FILE_PATH_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.optionalFilePath(filePath),
  );
}

export function explorerFilterPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null {
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_EXPLORER_FILTER_RULES);
  if (!rule?.visibleText) return null;
  const query = extractXenesisNaturalFilterQuery(rawText);
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.filterQuery(query)),
  ]);
}

export function explorerNavigatePlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null {
  const explorerPath = extractXenesisNaturalLocalPath(rawText);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES);
  if (!rule?.visibleText || !explorerPath) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.explorerPath(explorerPath)),
  ]);
}

export function explorerSimplePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_EXPLORER_SIMPLE_RULES);
}

export function deskMiscReadPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DESK_MISC_READ_RULES);
}

export function terminalListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_TERMINAL_LIST_RULES);
}

export function terminalManyPlanFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  const count = extractXenesisNaturalTerminalCount(value);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_TERMINAL_MANY_RULES);
  if (!rule?.visibleText || !count || count <= 1) return null;

  const actions: XenesisNaturalDeskActionRequest[] = [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.terminalMany(count, placement)),
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
  return buildXenesisNaturalLanguagePlan(rule.visibleText, actions);
}

export function terminalRunPlanFromNaturalText(
  value: string,
  rawText: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_TERMINAL_RUN_RULES);
  if (!rule?.visibleText) return null;
  const command = extractXenesisNaturalTerminalCommand(rawText);
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.terminalRun(command, placement)),
  ]);
}

export function dockWindowArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const scopedArrangeMode = detectXenesisNaturalArrangeMode(value);
  const windowState = detectXenesisNaturalDockWindowState(value);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
  if (!scopedArrangeMode || !windowState || !rule?.visibleText) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(
      rule.action,
      XENESIS_NATURAL_DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
    ),
  ]);
}

export function dockPaneArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const scopedArrangeMode = detectXenesisNaturalArrangeMode(value);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES);
  if (!scopedArrangeMode || !rule?.visibleText) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode)),
  ]);
}

export function dockGroupArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES);
}

export function dockWindowMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const windowState = detectXenesisNaturalDockWindowState(value);
  const rule = findXenesisNaturalCatalogRule(value, XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES);
  if (!windowState || !rule?.visibleText) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [
    buildXenesisNaturalCatalogAction(rule.action, { windowState }),
  ]);
}

export function dockPaneMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_DOCK_PANE_MERGE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
}

export function dockGroupMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES);
}

export function dockPanesListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(value, XENESIS_NATURAL_DOCK_PANES_LIST_RULES);
}

export function artifactTargetPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return findXenesisNaturalCatalogRulePlan(
    value,
    XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
}

export function viewOpenPlanFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  const view = viewKindFromNaturalText(value);
  if (!view || !matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES)) return null;
  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedViewOpen, [
    buildXenesisNaturalViewOpenAction(view, placement),
  ]);
}
