import {
  buildXenesisNaturalCatalogAction,
  buildXenesisNaturalCoreToolOpenAction,
  buildXenesisNaturalOnboardingArgsForRule,
  buildXenesisNaturalTemplateAction,
  buildXenesisNaturalViewOpenAction,
  detectXenesisNaturalArrangeMode,
  detectXenesisNaturalDockSide,
  detectXenesisNaturalDockWindowState,
  detectXenesisNaturalPlacement,
  detectXenesisNaturalWindowSizePreset,
  extractXenesisNaturalDockSize,
  extractXenesisNaturalFilterQuery,
  extractXenesisNaturalLocalPath,
  extractXenesisNaturalQuotedText,
  extractXenesisNaturalQuotedTexts,
  extractXenesisNaturalTerminalCommand,
  extractXenesisNaturalTerminalCount,
  findXenesisNaturalCatalogRuleAction,
  findXenesisNaturalConnectionAggregateOpenAction,
  findXenesisNaturalConnectionAggregateStatusAction,
  findXenesisNaturalConnectionTarget,
  findXenesisNaturalConnectionTargetRuleAction,
  findXenesisNaturalContextRule,
  findXenesisNaturalCoreToolTarget,
  findXenesisNaturalGuideTarget,
  findXenesisNaturalOnboardingStepTarget,
  findXenesisNaturalProviderRuleAction,
  findXenesisNaturalProviderTarget,
  findXenesisNaturalViewTarget,
  hasXenesisNaturalActionIntent,
  hasXenesisNaturalAggregateCatalogContext,
  hasXenesisNaturalConnectionReadbackIntent,
  hasXenesisNaturalConnectionReviewRequestIntent,
  hasXenesisNaturalExplicitOpenIntent,
  hasXenesisNaturalExternalMessengerCatalogContext,
  hasXenesisNaturalExternalToolCatalogContext,
  hasXenesisNaturalMessengerProfileDraftCatalogContext,
  hasXenesisNaturalOnboardingContext,
  hasXenesisNaturalProviderProfileContext,
  matchesXenesisNaturalContextRule,
  matchesXenesisNaturalContextRules,
  normalizeXenesisNaturalLanguageText,
  stripXenesisNaturalQuotedText,
  XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
  XENESIS_NATURAL_AGENT_READBACK_RULES,
  XENESIS_NATURAL_AGENT_SUBMIT_RULES,
  XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES,
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
  XENESIS_NATURAL_GATEWAY_ACTION_RULES,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_STATUS_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_ONBOARDING_OPEN_RULES,
  XENESIS_NATURAL_ONBOARDING_STATUS_RULES,
  XENESIS_NATURAL_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_OPEN_OR_SHOW_RULES,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_PROFILE_INVENTORY_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_PROVIDER_AUTO_TARGET,
  XENESIS_NATURAL_PROVIDER_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_STATUS_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES,
  XENESIS_NATURAL_RUN_START_RULES,
  XENESIS_NATURAL_RUNTIME_CONTROL_RULES,
  XENESIS_NATURAL_RUNTIME_INVENTORY_RULES,
  XENESIS_NATURAL_RUNTIME_SUPPORT_RULES,
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
  XENESIS_NATURAL_WORKSPACE_SET_RULES,
  type XenesisDeskActionParseResult,
  type XenesisNaturalCatalogActionRule,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalGuideOpenRule,
  type XenesisNaturalGuideStatusRule,
} from './xenesisNaturalLanguageCatalog';

export type XenesisDeskActionRequest = XenesisNaturalDeskActionRequest;

export interface XenesisDeskNaturalLanguagePlan extends XenesisDeskActionParseResult {
  matched: boolean;
}

function naturalCatalogRuleFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
): XenesisNaturalCatalogActionRule | null {
  return findXenesisNaturalContextRule(value, rules);
}

function naturalCatalogRuleActionFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, rules, args);
}

function naturalCatalogRulePlanFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisDeskNaturalLanguagePlan | null {
  const rule = naturalCatalogRuleFromNaturalText(value, rules);
  if (!rule?.visibleText) return null;
  return naturalPlan(rule.visibleText, [buildXenesisNaturalCatalogAction(rule.action, args)]);
}

function naturalPlan(
  visibleText: string,
  actions: XenesisDeskActionRequest[],
  errors: string[] = [],
): XenesisDeskNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

function emptyNaturalPlan(): XenesisDeskNaturalLanguagePlan {
  return { visibleText: XENESIS_NATURAL_TEXT_DEFAULTS.empty, actions: [], errors: [], matched: false };
}

function toolOpenActionFromNaturalText(value: string, placement: string | undefined): XenesisDeskActionRequest | null {
  const definition = findXenesisNaturalCoreToolTarget(value);
  if (!definition) return null;
  return buildXenesisNaturalCoreToolOpenAction(definition, placement);
}

function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
  const target = findXenesisNaturalViewTarget(value);
  if (!target) return null;
  return { id: target.id, kind: target.kind, reason: target.reason };
}

function xenesisConnectionTargetFromNaturalText(value: string): XenesisNaturalConnectionTarget | null {
  return findXenesisNaturalConnectionTarget(value);
}

function xenesisConnectionTargetStatusActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES);
}

function xenesisConnectionTargetOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES);
}

function xenesisGuideFromNaturalText(
  value: string,
  rule: XenesisNaturalGuideOpenRule | XenesisNaturalGuideStatusRule,
): { id: string; label: string } | null {
  if (!matchesXenesisNaturalContextRule(value, rule)) return null;

  return findXenesisNaturalGuideTarget(value);
}

function xenesisGuideActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const rule = findXenesisNaturalContextRule(value, XENESIS_NATURAL_GUIDE_OPEN_RULES);
  if (!rule) return null;

  const guide = xenesisGuideFromNaturalText(value, rule);
  if (!guide) return null;

  const openFile = matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES);

  return buildXenesisNaturalTemplateAction(
    rule.action,
    [guide.id, guide.label, openFile],
    XENESIS_NATURAL_DESK_ACTION_ARGS.openFileVisible(guide.id, openFile),
  );
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const rule = findXenesisNaturalContextRule(value, XENESIS_NATURAL_GUIDE_STATUS_RULES);
  if (!rule) return null;

  const guide = xenesisGuideFromNaturalText(value, rule);
  if (!guide) return null;

  return buildXenesisNaturalTemplateAction(
    rule.action,
    [guide.id, guide.label],
    XENESIS_NATURAL_DESK_ACTION_ARGS.targetId(guide.id),
  );
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasXenesisNaturalOnboardingContext(value)) return null;

  return findXenesisNaturalOnboardingStepTarget(value);
}

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  for (const rule of XENESIS_NATURAL_ONBOARDING_OPEN_RULES) {
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;

    if (rule.targetRequired) {
      if (!step) continue;

      return buildXenesisNaturalTemplateAction(
        rule.action,
        [step.id, step.label],
        buildXenesisNaturalOnboardingArgsForRule(rule, step.id),
      );
    }

    if (!rule.targetRequired) {
      return buildXenesisNaturalCatalogAction(rule.action, buildXenesisNaturalOnboardingArgsForRule(rule));
    }
  }

  return null;
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  for (const rule of XENESIS_NATURAL_ONBOARDING_STATUS_RULES) {
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    if (!rule.targetRequired) continue;

    return buildXenesisNaturalTemplateAction(
      rule.action,
      [step.id, step.label],
      buildXenesisNaturalOnboardingArgsForRule(rule, step.id),
    );
  }

  return null;
}

function xenesisToolAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalExternalToolCatalogContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES);
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalProviderTarget(value);
  if (provider) return provider;
  if (hasXenesisNaturalProviderProfileContext(value)) return XENESIS_NATURAL_PROVIDER_AUTO_TARGET;
  return null;
}

function xenesisProviderAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalProviderProfileContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES);
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const providerAggregateAction = xenesisProviderAggregateStatusActionFromNaturalText(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderRuleAction(value, provider, XENESIS_NATURAL_PROVIDER_STATUS_RULES);
}

function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisNaturalMessengerProfileDraftCatalogContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES);
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (target) {
    const targetStatusAction = xenesisConnectionTargetStatusActionFromNaturalText(value, target);
    if (targetStatusAction) return targetStatusAction;
  }

  const earlyConnectionAggregateStatusAction = findXenesisNaturalConnectionAggregateStatusAction(value, 'early');
  if (earlyConnectionAggregateStatusAction) return earlyConnectionAggregateStatusAction;

  const guideStatusAction = xenesisGuideStatusActionFromNaturalText(value);
  if (guideStatusAction) return guideStatusAction;

  const toolAggregateStatusAction = xenesisToolAggregateStatusActionFromNaturalText(value);
  if (toolAggregateStatusAction) return toolAggregateStatusAction;

  const messengerAggregateStatusAction = xenesisMessengerAggregateStatusActionFromNaturalText(value);
  if (messengerAggregateStatusAction) return messengerAggregateStatusAction;

  if (hasXenesisNaturalOnboardingContext(value)) {
    const onboardingStatusAction = xenesisOnboardingStatusActionFromNaturalText(value);
    if (onboardingStatusAction) return onboardingStatusAction;

    const onboardingAggregateStatusAction = findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
    if (onboardingAggregateStatusAction) return onboardingAggregateStatusAction;
  }

  return findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
}

function xenesisConnectionReviewRequestActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalConnectionReviewRequestIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (provider) {
    const providerReviewRequestAction = findXenesisNaturalProviderRuleAction(
      value,
      provider,
      XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
    );
    if (providerReviewRequestAction) return providerReviewRequestAction;
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES);
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderRuleAction(value, provider, XENESIS_NATURAL_PROVIDER_OPEN_RULES);
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return findXenesisNaturalConnectionAggregateOpenAction(value, 'guide');
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  if (hasXenesisNaturalProviderProfileContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (hasXenesisNaturalExternalToolCatalogContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (
    hasXenesisNaturalExternalMessengerCatalogContext(value) ||
    hasXenesisNaturalMessengerProfileDraftCatalogContext(value)
  ) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  return null;
}

function xenesisConnectionActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guideCatalogOpenAction = xenesisGuideCatalogOpenActionFromNaturalText(value);
  if (guideCatalogOpenAction) return guideCatalogOpenAction;

  const guideAction = xenesisGuideActionFromNaturalText(value);
  if (guideAction) return guideAction;

  const aggregateOpenAction = xenesisAggregateConnectionCenterOpenActionFromNaturalText(value);
  if (aggregateOpenAction) return aggregateOpenAction;

  const providerAction = xenesisProviderOpenActionFromNaturalText(value);
  if (providerAction) return providerAction;

  const onboardingAction = xenesisOnboardingOpenActionFromNaturalText(value);
  if (onboardingAction) return onboardingAction;

  const lateConnectionAggregateOpenAction = findXenesisNaturalConnectionAggregateOpenAction(value, 'late');
  if (lateConnectionAggregateOpenAction) return lateConnectionAggregateOpenAction;

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  const targetOpenAction = xenesisConnectionTargetOpenActionFromNaturalText(value, target);
  if (targetOpenAction) return targetOpenAction;

  return null;
}

function localCliMcpReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_RUNTIME_SUPPORT_RULES);
}

function xenesisGatewayActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_GATEWAY_ACTION_RULES);
}

function xenesisAgentReadbackActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  const agentId = extractXenesisNaturalQuotedText(rawText);
  if (!agentId) return null;

  return naturalCatalogRuleActionFromNaturalText(
    value,
    XENESIS_NATURAL_AGENT_READBACK_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.agentId(agentId),
  );
}

function xenesisRuntimeInventoryActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  const xenesisAgentReadbackAction = xenesisAgentReadbackActionFromNaturalText(value, rawText);
  if (xenesisAgentReadbackAction) return xenesisAgentReadbackAction;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_RUNTIME_INVENTORY_RULES);
}

function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_PROFILE_INVENTORY_RULES);
}

function xenesisAgentSubmitActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const [agentId, text] = extractXenesisNaturalQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return naturalCatalogRuleActionFromNaturalText(
    intentValue,
    XENESIS_NATURAL_AGENT_SUBMIT_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.agentSubmit(agentId, text),
  );
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const prompt = extractXenesisNaturalQuotedText(rawText);
  if (!prompt) return null;

  return naturalCatalogRuleActionFromNaturalText(
    intentValue,
    XENESIS_NATURAL_RUN_START_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.prompt(prompt),
  );
}

function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_RUNTIME_CONTROL_RULES);
}

function xenesisWorkspaceSetActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  const path = extractXenesisNaturalLocalPath(rawText);
  if (!path) return null;

  return naturalCatalogRuleActionFromNaturalText(
    value,
    XENESIS_NATURAL_WORKSPACE_SET_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.workspacePath(path),
  );
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || XENESIS_NATURAL_TEXT_DEFAULTS.empty).trim();
  const value = normalizeXenesisNaturalLanguageText(rawText);
  if (!value || !hasXenesisNaturalActionIntent(value)) return emptyNaturalPlan();

  const placement = detectXenesisNaturalPlacement(value);

  const xenesisAgentSubmitAction = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (xenesisAgentSubmitAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.agentSubmitRecorded, [xenesisAgentSubmitAction]);
  }

  const xenesisRunStartAction = xenesisRunStartActionFromNaturalText(rawText);
  if (xenesisRunStartAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runStartRecorded, [xenesisRunStartAction]);
  }

  const xenesisWorkspaceSetAction = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (xenesisWorkspaceSetAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.workspaceSetRecorded, [xenesisWorkspaceSetAction]);
  }

  const xenesisConnectionReviewRequestAction = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (xenesisConnectionReviewRequestAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionReviewRequestRecorded, [
      xenesisConnectionReviewRequestAction,
    ]);
  }

  const explicitXenesisConnectionOpenAction = xenesisConnectionActionFromNaturalText(value);
  if (
    explicitXenesisConnectionOpenAction &&
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_COMMAND_RULES)
  ) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [explicitXenesisConnectionOpenAction]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionStatusRead, [xenesisConnectionReadbackAction]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.connectionSurfaceOpen, [xenesisConnectionAction]);
  }

  const localCliMcpReadbackAction = localCliMcpReadbackActionFromNaturalText(value);
  if (localCliMcpReadbackAction) {
    if (localCliMcpReadbackAction.path === XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList) {
      return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.actionInboxListRead, [localCliMcpReadbackAction]);
    }
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.localCliMcpStatusRead, [localCliMcpReadbackAction]);
  }

  const xenesisGatewayAction = xenesisGatewayActionFromNaturalText(value);
  if (xenesisGatewayAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.gatewayStatusOrOpen, [xenesisGatewayAction]);
  }

  const xenesisRuntimeInventoryAction = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (xenesisRuntimeInventoryAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeInventoryRead, [xenesisRuntimeInventoryAction]);
  }

  const xenesisProfileInventoryAction = xenesisProfileInventoryActionFromNaturalText(value);
  if (xenesisProfileInventoryAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.profileInventoryRead, [xenesisProfileInventoryAction]);
  }

  const xenesisRuntimeControlAction = xenesisRuntimeControlActionFromNaturalText(value);
  if (xenesisRuntimeControlAction) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.runtimeControlRecorded, [xenesisRuntimeControlAction]);
  }

  const deskPaneOpenPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.placement(placement),
  );
  if (deskPaneOpenPlan) return deskPaneOpenPlan;

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedToolPanelOpen, [toolOpenAction]);
  }

  const deskCapturePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_CAPTURE_RULES);
  if (deskCapturePlan) return deskCapturePlan;

  const activeDockFocusPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockFocusPlan) return activeDockFocusPlan;

  const activeDockClosePlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockClosePlan) return activeDockClosePlan;

  const dockSide = detectXenesisNaturalDockSide(value);
  const dockSize = extractXenesisNaturalDockSize(value);
  const dockSizeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_SIZE_RULES);
  if (dockSizeRule?.visibleText && dockSide && dockSize) {
    return naturalPlan(dockSizeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        dockSizeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockSize(dockSide, dockSize),
      ),
    ]);
  }

  const presetId = detectXenesisNaturalWindowSizePreset(value);
  const windowSizeRule = presetId
    ? naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES)
    : null;
  if (presetId && windowSizeRule) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.windowSizePreset(presetId), [
      buildXenesisNaturalCatalogAction(windowSizeRule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.presetId(presetId)),
    ]);
  }

  const deskFileListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_FILE_LIST_RULES);
  if (deskFileListPlan) return deskFileListPlan;

  const filePath = extractXenesisNaturalLocalPath(rawText);
  const deskFilePathPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DESK_FILE_PATH_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.optionalFilePath(filePath),
  );
  if (deskFilePathPlan) return deskFilePathPlan;

  const explorerFilterRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_FILTER_RULES);
  if (explorerFilterRule?.visibleText) {
    const query = extractXenesisNaturalFilterQuery(rawText);
    return naturalPlan(explorerFilterRule.visibleText, [
      buildXenesisNaturalCatalogAction(explorerFilterRule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.filterQuery(query)),
    ]);
  }

  const explorerPath = extractXenesisNaturalLocalPath(rawText);
  const explorerNavigateRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES);
  if (explorerNavigateRule?.visibleText && explorerPath) {
    return naturalPlan(explorerNavigateRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        explorerNavigateRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.explorerPath(explorerPath),
      ),
    ]);
  }

  const explorerSimplePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_EXPLORER_SIMPLE_RULES);
  if (explorerSimplePlan) return explorerSimplePlan;

  const deskMiscReadPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_MISC_READ_RULES);
  if (deskMiscReadPlan) return deskMiscReadPlan;

  const terminalListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_TERMINAL_LIST_RULES);
  if (terminalListPlan) return terminalListPlan;

  const count = extractXenesisNaturalTerminalCount(value);
  const terminalManyRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_TERMINAL_MANY_RULES);
  if (terminalManyRule?.visibleText && count && count > 1) {
    const actions = [
      buildXenesisNaturalCatalogAction(
        terminalManyRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.terminalMany(count, placement),
      ),
    ];
    const arrangeMode = detectXenesisNaturalArrangeMode(value);
    const terminalArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
    if (arrangeMode && terminalArrangeRule) {
      actions.push(
        buildXenesisNaturalCatalogAction(
          terminalArrangeRule.action,
          XENESIS_NATURAL_DESK_ACTION_ARGS.dockWindowArrange(detectXenesisNaturalDockWindowState(value), arrangeMode),
        ),
      );
    }
    return naturalPlan(terminalManyRule.visibleText, actions);
  }

  const terminalRunRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_TERMINAL_RUN_RULES);
  if (terminalRunRule?.visibleText) {
    const command = extractXenesisNaturalTerminalCommand(rawText);
    return naturalPlan(terminalRunRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        terminalRunRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.terminalRun(command, placement),
      ),
    ]);
  }

  const scopedArrangeMode = detectXenesisNaturalArrangeMode(value);
  const windowState = detectXenesisNaturalDockWindowState(value);
  const windowArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
  if (scopedArrangeMode && windowState && windowArrangeRule?.visibleText) {
    return naturalPlan(windowArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        windowArrangeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
      ),
    ]);
  }

  const paneArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES);
  if (scopedArrangeMode && paneArrangeRule?.visibleText) {
    return naturalPlan(paneArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        paneArrangeRule.action,
        XENESIS_NATURAL_DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode),
      ),
    ]);
  }

  const dockGroupArrangePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES);
  if (dockGroupArrangePlan) return dockGroupArrangePlan;

  const dockWindowMergeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES);
  if (windowState && dockWindowMergeRule?.visibleText) {
    return naturalPlan(dockWindowMergeRule.visibleText, [
      buildXenesisNaturalCatalogAction(dockWindowMergeRule.action, { windowState }),
    ]);
  }

  const dockPaneMergePlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DOCK_PANE_MERGE_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (dockPaneMergePlan) return dockPaneMergePlan;

  const dockGroupMergePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES);
  if (dockGroupMergePlan) return dockGroupMergePlan;

  const dockPanesListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_PANES_LIST_RULES);
  if (dockPanesListPlan) return dockPanesListPlan;

  const artifactTargetPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.useActive(),
  );
  if (artifactTargetPlan) return artifactTargetPlan;

  const view = viewKindFromNaturalText(value);
  if (view && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES)) {
    return naturalPlan(XENESIS_NATURAL_PLAN_VISIBLE_TEXT.requestedViewOpen, [
      buildXenesisNaturalViewOpenAction(view, placement),
    ]);
  }

  return emptyNaturalPlan();
}
