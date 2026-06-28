import {
  buildXenesisNaturalCatalogAction,
  buildXenesisNaturalCoreToolOpenAction,
  buildXenesisNaturalOnboardingArgsForRule,
  buildXenesisNaturalTemplateAction,
  findXenesisNaturalCatalogRuleAction,
  findXenesisNaturalConnectionAggregateOpenAction,
  findXenesisNaturalConnectionAggregateStatusAction,
  findXenesisNaturalConnectionTargetRuleAction,
  findXenesisNaturalCoreToolTarget,
  findXenesisNaturalMessengerViewSectionTarget,
  findXenesisNaturalProviderRuleAction,
  findXenesisNaturalProviderViewSectionTarget,
  findXenesisNaturalToolViewSectionTarget,
  findXenesisNaturalViewTarget,
  XENESIS_NATURAL_AGENT_READBACK_RULES,
  XENESIS_NATURAL_AGENT_SUBMIT_RULES,
  XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_TARGET_RULES,
  XENESIS_NATURAL_CHANNEL_TEST_TARGET_RULES,
  XENESIS_NATURAL_CONNECTION_SETUP_APPLY_TARGET_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES,
  XENESIS_NATURAL_DESK_ACTION_ARGS,
  XENESIS_NATURAL_GATEWAY_ACTION_RULES,
  XENESIS_NATURAL_GUIDE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_STATUS_RULES,
  XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_TARGET_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULES,
  XENESIS_NATURAL_ONBOARDING_OPEN_RULES,
  XENESIS_NATURAL_ONBOARDING_STATUS_RULES,
  XENESIS_NATURAL_PROFILE_INVENTORY_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_PROVIDER_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_PROVIDER_RULES,
  XENESIS_NATURAL_PROVIDER_STATUS_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES,
  XENESIS_NATURAL_RUN_START_RULES,
  XENESIS_NATURAL_RUNTIME_CONTROL_RULES,
  XENESIS_NATURAL_RUNTIME_INVENTORY_RULES,
  XENESIS_NATURAL_RUNTIME_SUPPORT_RULES,
  XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_WORKSPACE_SET_RULES,
} from './xenesisNaturalLanguageCapabilityCatalog';
import {
  extractXenesisNaturalLocalPath,
  extractXenesisNaturalQuotedText,
  extractXenesisNaturalQuotedTexts,
  findXenesisNaturalConnectionTarget,
  findXenesisNaturalContextRule,
  findXenesisNaturalGuideTarget,
  findXenesisNaturalOnboardingStepTarget,
  findXenesisNaturalProviderTarget,
  hasXenesisNaturalAggregateCatalogContext,
  hasXenesisNaturalConnectionReadbackIntent,
  hasXenesisNaturalConnectionReviewRequestIntent,
  hasXenesisNaturalExplicitOpenIntent,
  hasXenesisNaturalExternalMessengerCatalogContext,
  hasXenesisNaturalExternalToolCatalogContext,
  hasXenesisNaturalMessengerProfileDraftCatalogContext,
  hasXenesisNaturalOnboardingContext,
  hasXenesisNaturalProviderProfileContext,
  isXenesisNaturalConnectionMessengerTarget,
  isXenesisNaturalConnectionToolTarget,
  matchesXenesisNaturalContextRule,
  matchesXenesisNaturalContextRules,
  normalizeXenesisNaturalLanguageText,
  stripXenesisNaturalQuotedText,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_AUTO_TARGET,
  XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalGuideOpenRule,
  type XenesisNaturalGuideStatusRule,
} from './xenesisNaturalLanguageCatalog';

export function toolOpenActionFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest | null {
  const definition = findXenesisNaturalCoreToolTarget(value);
  if (!definition) return null;
  return buildXenesisNaturalCoreToolOpenAction(definition, placement);
}

export function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
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
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES);
}

function xenesisConnectionTargetOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES);
}

function xenesisGuideFromNaturalText(
  value: string,
  rule: XenesisNaturalGuideOpenRule | XenesisNaturalGuideStatusRule,
): { id: string; label: string } | null {
  if (!matchesXenesisNaturalContextRule(value, rule)) return null;

  return findXenesisNaturalGuideTarget(value);
}

function xenesisGuideActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
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

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
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

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
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

    if (rule.argsKind === 'ensureVisible') {
      return buildXenesisNaturalCatalogAction(rule.action, buildXenesisNaturalOnboardingArgsForRule(rule));
    }
  }

  return null;
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
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

function xenesisToolAggregateStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalExternalToolCatalogContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;

  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES);
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalProviderTarget(value);
  if (provider) return provider;
  if (hasXenesisNaturalProviderProfileContext(value)) return XENESIS_NATURAL_PROVIDER_AUTO_TARGET;
  return null;
}

function xenesisProviderAggregateStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalProviderProfileContext(value)) return null;
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES);
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  const providerAggregateAction = xenesisProviderAggregateStatusActionFromNaturalText(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderRuleAction(value, provider, XENESIS_NATURAL_PROVIDER_STATUS_RULES);
}

export function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisNaturalMessengerProfileDraftCatalogContext(value)) {
    return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES);
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

export function xenesisConnectionOAuthSetupPacketActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULES);
}

export function xenesisConnectionReviewRequestActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
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

export function xenesisConnectionMcpInstallDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(
    value,
    target,
    XENESIS_NATURAL_MCP_INSTALL_DRAFT_APPLY_TARGET_RULES,
  );
}

export function xenesisConnectionChannelProfileDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(
    value,
    target,
    XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_APPLY_TARGET_RULES,
  );
}

export function xenesisConnectionChannelTestActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(value, target, XENESIS_NATURAL_CHANNEL_TEST_TARGET_RULES);
}

export function xenesisConnectionSetupApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionTargetRuleAction(
    value,
    target,
    XENESIS_NATURAL_CONNECTION_SETUP_APPLY_TARGET_RULES,
  );
}

export function xenesisConnectionProviderProfileDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalProviderProfileContext(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderRuleAction(
    value,
    provider,
    XENESIS_NATURAL_PROVIDER_PROFILE_DRAFT_APPLY_PROVIDER_RULES,
  );
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (matchesXenesisNaturalContextRules(value, [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }])) {
    const section = findXenesisNaturalProviderViewSectionTarget(value);
    if (section) {
      return {
        id: `natural-xenesis-provider-view-section-open-${provider.id}-${section.id}`,
        path: 'xd.xenesis.providers.views.open',
        args: XENESIS_NATURAL_DESK_ACTION_ARGS.providerViewSectionVisible(provider.id, section.id),
        approved: false,
        reason: `Open ${provider.label} ${section.label} provider view section from natural language request.`,
      };
    }
  }

  return findXenesisNaturalProviderRuleAction(value, provider, XENESIS_NATURAL_PROVIDER_OPEN_RULES);
}

function xenesisToolViewSectionOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  if (!isXenesisNaturalConnectionToolTarget(target)) return null;
  if (!hasXenesisNaturalExplicitOpenIntent(value)) return null;
  if (!matchesXenesisNaturalContextRules(value, [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }])) {
    return null;
  }

  const section = findXenesisNaturalToolViewSectionTarget(value);
  if (!section) return null;

  return {
    id: `natural-xenesis-tool-view-section-open-${target.id}-${section.id}`,
    path: 'xd.xenesis.tools.views.open',
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.toolViewSectionVisible(target.id, section.id),
    approved: false,
    reason: `Open ${target.label} ${section.label} tool view section from natural language request.`,
  };
}

function xenesisMessengerViewSectionOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  if (!isXenesisNaturalConnectionMessengerTarget(target)) return null;
  if (!hasXenesisNaturalExplicitOpenIntent(value)) return null;
  if (!matchesXenesisNaturalContextRules(value, [{ contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS }])) {
    return null;
  }

  const section = findXenesisNaturalMessengerViewSectionTarget(value);
  if (!section) return null;

  return {
    id: `natural-xenesis-messenger-view-section-open-${target.id}-${section.id}`,
    path: 'xd.xenesis.messengers.views.open',
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.messengerViewSectionVisible(target.id, section.id),
    approved: false,
    reason: `Open ${target.label} ${section.label} messenger view section from natural language request.`,
  };
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionAggregateOpenAction(value, 'guide');
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalAggregateCatalogContext(value)) return null;

  if (hasXenesisNaturalProviderProfileContext(value)) {
    return findXenesisNaturalCatalogRuleAction(
      value,
      XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (hasXenesisNaturalExternalToolCatalogContext(value)) {
    return findXenesisNaturalCatalogRuleAction(
      value,
      XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (
    hasXenesisNaturalExternalMessengerCatalogContext(value) ||
    hasXenesisNaturalMessengerProfileDraftCatalogContext(value)
  ) {
    return findXenesisNaturalCatalogRuleAction(
      value,
      XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
      XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  return null;
}

export function xenesisConnectionActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
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

  const targetToolViewSectionOpenAction = xenesisToolViewSectionOpenActionFromNaturalText(value, target);
  if (targetToolViewSectionOpenAction) return targetToolViewSectionOpenAction;

  const targetMessengerViewSectionOpenAction = xenesisMessengerViewSectionOpenActionFromNaturalText(value, target);
  if (targetMessengerViewSectionOpenAction) return targetMessengerViewSectionOpenAction;

  const targetOpenAction = xenesisConnectionTargetOpenActionFromNaturalText(value, target);
  if (targetOpenAction) return targetOpenAction;

  return null;
}

export function localCliMcpReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_RUNTIME_SUPPORT_RULES);
}

export function xenesisGatewayActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_GATEWAY_ACTION_RULES);
}

function xenesisAgentReadbackActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const agentId = extractXenesisNaturalQuotedText(rawText);
  if (!agentId) return null;

  return findXenesisNaturalCatalogRuleAction(
    value,
    XENESIS_NATURAL_AGENT_READBACK_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.agentId(agentId),
  );
}

export function xenesisRuntimeInventoryActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const xenesisAgentReadbackAction = xenesisAgentReadbackActionFromNaturalText(value, rawText);
  if (xenesisAgentReadbackAction) return xenesisAgentReadbackAction;

  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_RUNTIME_INVENTORY_RULES);
}

export function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_PROFILE_INVENTORY_RULES);
}

export function xenesisAgentSubmitActionFromNaturalText(rawText: string): XenesisNaturalDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const [agentId, text] = extractXenesisNaturalQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return findXenesisNaturalCatalogRuleAction(
    intentValue,
    XENESIS_NATURAL_AGENT_SUBMIT_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.agentSubmit(agentId, text),
  );
}

export function xenesisRunStartActionFromNaturalText(rawText: string): XenesisNaturalDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const prompt = extractXenesisNaturalQuotedText(rawText);
  if (!prompt) return null;

  return findXenesisNaturalCatalogRuleAction(
    intentValue,
    XENESIS_NATURAL_RUN_START_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.prompt(prompt),
  );
}

export function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, XENESIS_NATURAL_RUNTIME_CONTROL_RULES);
}

export function xenesisWorkspaceSetActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const path = extractXenesisNaturalLocalPath(rawText);
  if (!path) return null;

  return findXenesisNaturalCatalogRuleAction(
    value,
    XENESIS_NATURAL_WORKSPACE_SET_RULES,
    XENESIS_NATURAL_DESK_ACTION_ARGS.workspacePath(path),
  );
}
