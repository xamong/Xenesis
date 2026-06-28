import {
  localCliMcpReadbackActionFromNaturalText,
  toolOpenActionFromNaturalText,
  viewKindFromNaturalText,
  xenesisAgentSubmitActionFromNaturalText,
  xenesisConnectionActionFromNaturalText,
  xenesisConnectionChannelProfileDraftApplyActionFromNaturalText,
  xenesisConnectionChannelTestActionFromNaturalText,
  xenesisConnectionMcpInstallDraftApplyActionFromNaturalText,
  xenesisConnectionOAuthSetupPacketActionFromNaturalText,
  xenesisConnectionProviderProfileDraftApplyActionFromNaturalText,
  xenesisConnectionReadbackActionFromNaturalText,
  xenesisConnectionReviewRequestActionFromNaturalText,
  xenesisConnectionSetupApplyActionFromNaturalText,
  xenesisConnectionUserStoryWorkflowPreviewActionFromNaturalText,
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
  findXenesisNaturalSettingsCategoryTarget,
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
  XENESIS_NATURAL_GATEWAY_LIFECYCLE_PLAN_PATHS,
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
} from './xenesisNaturalLanguageCapabilityCatalog';
import {
  buildXenesisNaturalLanguagePlan,
  buildXenesisNaturalSingleActionPlan,
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
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.agentSubmitRecorded,
    xenesisAgentSubmitActionFromNaturalText(rawText),
  );
}

export function xenesisRunStartPlanFromNaturalText(rawText: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runStartRecorded,
    xenesisRunStartActionFromNaturalText(rawText),
  );
}

export function xenesisWorkspaceSetPlanFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.workspaceSetRecorded,
    xenesisWorkspaceSetActionFromNaturalText(value, rawText),
  );
}

export function xenesisConnectionReviewRequestPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionReviewRequestRecorded,
    xenesisConnectionReviewRequestActionFromNaturalText(value),
  );
}

export function xenesisConnectionUserStoryWorkflowPreviewPlanFromNaturalText(
  value: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionUserStoryWorkflowPreviewRecorded,
    xenesisConnectionUserStoryWorkflowPreviewActionFromNaturalText(value),
  );
}

export function xenesisConnectionMcpInstallDraftApplyPlanFromNaturalText(
  value: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionMcpInstallDraftApplyRecorded,
    xenesisConnectionMcpInstallDraftApplyActionFromNaturalText(value),
  );
}

export function xenesisConnectionChannelProfileDraftApplyPlanFromNaturalText(
  value: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionChannelProfileDraftApplyRecorded,
    xenesisConnectionChannelProfileDraftApplyActionFromNaturalText(value),
  );
}

export function xenesisConnectionChannelTestPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionChannelTestRecorded,
    xenesisConnectionChannelTestActionFromNaturalText(value),
  );
}

export function xenesisConnectionProviderProfileDraftApplyPlanFromNaturalText(
  value: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionProviderProfileDraftApplyRecorded,
    xenesisConnectionProviderProfileDraftApplyActionFromNaturalText(value),
  );
}

export function xenesisConnectionSetupApplyPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSetupApplyRecorded,
    xenesisConnectionSetupApplyActionFromNaturalText(value),
  );
}

export function xenesisConnectionOAuthSetupPacketPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionStatusRead,
    xenesisConnectionOAuthSetupPacketActionFromNaturalText(value),
  );
}

export function explicitXenesisConnectionOpenPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionActionFromNaturalText(value);
  if (!matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_COMMAND_RULES)) return null;
  return buildXenesisNaturalSingleActionPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, action);
}

export function xenesisConnectionReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionStatusRead,
    xenesisConnectionReadbackActionFromNaturalText(value),
  );
}

export function xenesisConnectionOpenOrShowPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisConnectionActionFromNaturalText(value);
  if (!matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) return null;
  return buildXenesisNaturalSingleActionPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, action);
}

export function localCliMcpReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = localCliMcpReadbackActionFromNaturalText(value);
  if (action?.path === XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList) {
    return buildXenesisNaturalSingleActionPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.actionInboxListRead, action);
  }
  return buildXenesisNaturalSingleActionPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.localCliMcpStatusRead, action);
}

export function xenesisGatewayPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  const action = xenesisGatewayActionFromNaturalText(value);
  const visibleText = XENESIS_NATURAL_GATEWAY_LIFECYCLE_PLAN_PATHS.includes(
    action?.path as (typeof XENESIS_NATURAL_GATEWAY_LIFECYCLE_PLAN_PATHS)[number],
  )
    ? XENESIS_NATURAL_PLAN_VISIBLE_TEXT.gatewayLifecycleRecorded
    : XENESIS_NATURAL_PLAN_VISIBLE_TEXT.gatewayStatusOrOpen;
  return buildXenesisNaturalSingleActionPlan(visibleText, action);
}

export function xenesisRuntimeInventoryPlanFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeInventoryRead,
    xenesisRuntimeInventoryActionFromNaturalText(value, rawText),
  );
}

export function xenesisProfileInventoryPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.profileInventoryRead,
    xenesisProfileInventoryActionFromNaturalText(value),
  );
}

export function xenesisRuntimeControlPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null {
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeControlRecorded,
    xenesisRuntimeControlActionFromNaturalText(value),
  );
}

export function deskSettingsCategoryOpenPlanFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalLanguagePlan | null {
  const target = findXenesisNaturalSettingsCategoryTarget(value);
  if (!target) return null;

  return buildXenesisNaturalLanguagePlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.settingsPaneOpen, [
    buildXenesisNaturalCatalogAction(
      target.action,
      XENESIS_NATURAL_DESK_ACTION_ARGS.settingsCategory(target.category, placement),
    ),
  ]);
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
  if (!matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) return null;
  return buildXenesisNaturalSingleActionPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedToolPanelOpen, action);
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
  return buildXenesisNaturalSingleActionPlan(
    XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedViewOpen,
    buildXenesisNaturalViewOpenAction(view, placement),
  );
}
