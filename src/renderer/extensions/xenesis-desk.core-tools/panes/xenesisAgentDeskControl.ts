import { buildXenesisDeskControlPromptHint as buildXenesisDeskControlPromptHintFromShared } from '../../../../shared/xenesisDeskControlPromptHint';
import {
  approveXenesisDeskActions as approveXenesisDeskActionsFromCatalog,
  buildXenesisDeskActionCompletedMessage as buildXenesisDeskActionCompletedMessageFromCatalog,
  buildXenesisDeskActionPendingMessage as buildXenesisDeskActionPendingMessageFromCatalog,
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
  isXenesisDeskActionApprovalRequiredResult as isXenesisDeskActionApprovalRequiredResultFromCatalog,
  matchesXenesisNaturalContextRule,
  matchesXenesisNaturalContextRules,
  normalizeXenesisNaturalLanguageText,
  parseXenesisDeskActionBlocks as parseXenesisDeskActionBlocksFromCatalog,
  pendingXenesisDeskActionsFromResults as pendingXenesisDeskActionsFromResultsFromCatalog,
  shouldRunXenesisDeskActionsDirectly as shouldRunXenesisDeskActionsDirectlyFromCatalog,
  stripXenesisNaturalQuotedText,
  summarizeXenesisDeskActionExecution as summarizeXenesisDeskActionExecutionFromCatalog,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_EXECUTION_STATUS,
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  XENESIS_NATURAL_ACTION_INTENT_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
  XENESIS_NATURAL_AGENT_READBACK_RULES,
  XENESIS_NATURAL_AGENT_SUBMIT_RULES,
  XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_RULES,
  XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES,
  XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES,
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
  XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES,
  XENESIS_NATURAL_EXPLORER_FILTER_RULES,
  XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES,
  XENESIS_NATURAL_EXPLORER_SIMPLE_RULES,
  XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES,
  XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES,
  XENESIS_NATURAL_GATEWAY_ACTION_RULES,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_STATUS_RULES,
  XENESIS_NATURAL_INTENT_PATTERNS,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_MESSENGER_PROFILE_DRAFT_CATALOG_CONTEXT_RULES,
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
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES,
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
  type XenesisDeskActionActivityPhase as XenesisDeskActionActivityPhaseCatalog,
  type XenesisDeskActionParseResult as XenesisDeskActionParseResultCatalog,
  type XenesisNaturalCatalogActionRule,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalGuideOpenRule,
  type XenesisNaturalGuideStatusRule,
} from '../../../../shared/xenesisNaturalLanguageCatalog';

export type XenesisDeskActionRequest = XenesisNaturalDeskActionRequest;

export type XenesisDeskActionParseResult = XenesisDeskActionParseResultCatalog;

export interface XenesisDeskActionCallOptions {
  approved?: boolean;
}

export interface XenesisDeskActionCallResult {
  ok?: boolean;
  path?: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export interface XenesisDeskActionExecutionResult {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export type XenesisDeskActionExecutor = (
  path: string,
  args?: unknown,
  options?: XenesisDeskActionCallOptions,
) => Promise<XenesisDeskActionCallResult>;

export type XenesisDeskActionActivityPhase = XenesisDeskActionActivityPhaseCatalog;

export interface XenesisDeskActionActivity {
  phase: XenesisDeskActionActivityPhase;
  action: XenesisDeskActionRequest;
  result?: XenesisDeskActionExecutionResult;
  error?: string;
}

export interface XenesisDeskActionRunOptions {
  onActivity?: (activity: XenesisDeskActionActivity) => void;
}

export interface XenesisDeskNaturalLanguagePlan extends XenesisDeskActionParseResult {
  matched: boolean;
}

function hasExplicitOpenIntent(value: string): boolean {
  return (
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES) ||
    INTENT_PATTERNS.explicitOpenEnglish.test(value)
  );
}

function hasActionIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_ACTION_INTENT_RULES);
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
  args: unknown = DESK_ACTION_ARGS.empty(),
): XenesisDeskActionRequest | null {
  return findXenesisNaturalCatalogRuleAction(value, rules, args);
}

function naturalCatalogRulePlanFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = DESK_ACTION_ARGS.empty(),
): XenesisDeskNaturalLanguagePlan | null {
  const rule = naturalCatalogRuleFromNaturalText(value, rules);
  if (!rule?.visibleText) return null;
  return naturalPlan(rule.visibleText, [buildXenesisNaturalCatalogAction(rule.action, args)]);
}

const DESK_ACTION_ACTIVITY_PHASES = XENESIS_DESK_ACTION_ACTIVITY_PHASES;
const DESK_ACTION_CALL_RESULT_KEYS = XENESIS_DESK_ACTION_CALL_RESULT_KEYS;
const DESK_ACTION_EXECUTION_STATUS = XENESIS_DESK_ACTION_EXECUTION_STATUS;
const DESK_ACTION_PROTOCOL_FORMAT = XENESIS_DESK_ACTION_PROTOCOL_FORMAT;
const DESK_ACTION_ARGS = XENESIS_NATURAL_DESK_ACTION_ARGS;
const INTENT_PATTERNS = XENESIS_NATURAL_INTENT_PATTERNS;
const NATURAL_TEXT_DEFAULTS = XENESIS_NATURAL_TEXT_DEFAULTS;
const PLAN_TEXT = XENESIS_NATURAL_PLAN_VISIBLE_TEXT;
const PROVIDER_AUTO_TARGET = XENESIS_NATURAL_PROVIDER_AUTO_TARGET;

function naturalPlan(
  visibleText: string,
  actions: XenesisDeskActionRequest[],
  errors: string[] = [],
): XenesisDeskNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

function emptyNaturalPlan(): XenesisDeskNaturalLanguagePlan {
  return { visibleText: NATURAL_TEXT_DEFAULTS.empty, actions: [], errors: [], matched: false };
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
    DESK_ACTION_ARGS.openFileVisible(guide.id, openFile),
  );
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const rule = findXenesisNaturalContextRule(value, XENESIS_NATURAL_GUIDE_STATUS_RULES);
  if (!rule) return null;

  const guide = xenesisGuideFromNaturalText(value, rule);
  if (!guide) return null;

  return buildXenesisNaturalTemplateAction(rule.action, [guide.id, guide.label], DESK_ACTION_ARGS.targetId(guide.id));
}

function hasXenesisOnboardingContext(value: string): boolean {
  return (
    findXenesisNaturalContextRule(value, XENESIS_NATURAL_ONBOARDING_OPEN_RULES) !== null ||
    findXenesisNaturalContextRule(value, XENESIS_NATURAL_ONBOARDING_STATUS_RULES) !== null
  );
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasXenesisOnboardingContext(value)) return null;

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

function hasXenesisConnectionReadbackIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES);
}

function hasExternalToolCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES);
}

function hasExternalMessengerCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES);
}

function hasXenesisAggregateCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_RULES);
}

function hasXenesisMessengerProfileDraftCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_MESSENGER_PROFILE_DRAFT_CATALOG_CONTEXT_RULES);
}

function xenesisToolAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalToolCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES);
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  return naturalCatalogRuleActionFromNaturalText(value, XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalProviderTarget(value);
  if (provider) return provider;
  if (hasXenesisProviderProfileContext(value)) return PROVIDER_AUTO_TARGET;
  return null;
}

function xenesisProviderAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisProviderProfileContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

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
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
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

  if (hasXenesisOnboardingContext(value)) {
    const onboardingStatusAction = xenesisOnboardingStatusActionFromNaturalText(value);
    if (onboardingStatusAction) return onboardingStatusAction;

    const onboardingAggregateStatusAction = findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
    if (onboardingAggregateStatusAction) return onboardingAggregateStatusAction;
  }

  return findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
}

function hasXenesisConnectionReviewRequestIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES);
}

function hasXenesisProviderProfileContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES);
}

function xenesisConnectionReviewRequestActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReviewRequestIntent(value)) return null;

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
  if (!hasExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderRuleAction(value, provider, XENESIS_NATURAL_PROVIDER_OPEN_RULES);
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return findXenesisNaturalConnectionAggregateOpenAction(value, 'guide');
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisProviderProfileContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
      DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (hasExternalToolCatalogContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
      DESK_ACTION_ARGS.ensureVisible(),
    );
  }

  if (hasExternalMessengerCatalogContext(value) || hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalCatalogRuleActionFromNaturalText(
      value,
      XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
      DESK_ACTION_ARGS.ensureVisible(),
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
    DESK_ACTION_ARGS.agentId(agentId),
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
    DESK_ACTION_ARGS.agentSubmit(agentId, text),
  );
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const prompt = extractXenesisNaturalQuotedText(rawText);
  if (!prompt) return null;

  return naturalCatalogRuleActionFromNaturalText(
    intentValue,
    XENESIS_NATURAL_RUN_START_RULES,
    DESK_ACTION_ARGS.prompt(prompt),
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
    DESK_ACTION_ARGS.workspacePath(path),
  );
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || NATURAL_TEXT_DEFAULTS.empty).trim();
  const value = normalizeXenesisNaturalLanguageText(rawText);
  if (!value || !hasActionIntent(value)) return emptyNaturalPlan();

  const placement = detectXenesisNaturalPlacement(value);

  const xenesisAgentSubmitAction = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (xenesisAgentSubmitAction) {
    return naturalPlan(PLAN_TEXT.agentSubmitRecorded, [xenesisAgentSubmitAction]);
  }

  const xenesisRunStartAction = xenesisRunStartActionFromNaturalText(rawText);
  if (xenesisRunStartAction) {
    return naturalPlan(PLAN_TEXT.runStartRecorded, [xenesisRunStartAction]);
  }

  const xenesisWorkspaceSetAction = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (xenesisWorkspaceSetAction) {
    return naturalPlan(PLAN_TEXT.workspaceSetRecorded, [xenesisWorkspaceSetAction]);
  }

  const xenesisConnectionReviewRequestAction = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (xenesisConnectionReviewRequestAction) {
    return naturalPlan(PLAN_TEXT.connectionReviewRequestRecorded, [xenesisConnectionReviewRequestAction]);
  }

  const explicitXenesisConnectionOpenAction = xenesisConnectionActionFromNaturalText(value);
  if (
    explicitXenesisConnectionOpenAction &&
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_COMMAND_RULES)
  ) {
    return naturalPlan(PLAN_TEXT.connectionSurfaceOpen, [explicitXenesisConnectionOpenAction]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return naturalPlan(PLAN_TEXT.connectionStatusRead, [xenesisConnectionReadbackAction]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return naturalPlan(PLAN_TEXT.connectionSurfaceOpen, [xenesisConnectionAction]);
  }

  const localCliMcpReadbackAction = localCliMcpReadbackActionFromNaturalText(value);
  if (localCliMcpReadbackAction) {
    if (localCliMcpReadbackAction.path === XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList) {
      return naturalPlan(PLAN_TEXT.actionInboxListRead, [localCliMcpReadbackAction]);
    }
    return naturalPlan(PLAN_TEXT.localCliMcpStatusRead, [localCliMcpReadbackAction]);
  }

  const xenesisGatewayAction = xenesisGatewayActionFromNaturalText(value);
  if (xenesisGatewayAction) {
    return naturalPlan(PLAN_TEXT.gatewayStatusOrOpen, [xenesisGatewayAction]);
  }

  const xenesisRuntimeInventoryAction = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (xenesisRuntimeInventoryAction) {
    return naturalPlan(PLAN_TEXT.runtimeInventoryRead, [xenesisRuntimeInventoryAction]);
  }

  const xenesisProfileInventoryAction = xenesisProfileInventoryActionFromNaturalText(value);
  if (xenesisProfileInventoryAction) {
    return naturalPlan(PLAN_TEXT.profileInventoryRead, [xenesisProfileInventoryAction]);
  }

  const xenesisRuntimeControlAction = xenesisRuntimeControlActionFromNaturalText(value);
  if (xenesisRuntimeControlAction) {
    return naturalPlan(PLAN_TEXT.runtimeControlRecorded, [xenesisRuntimeControlAction]);
  }

  const deskPaneOpenPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
    DESK_ACTION_ARGS.placement(placement),
  );
  if (deskPaneOpenPlan) return deskPaneOpenPlan;

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_OPEN_OR_SHOW_RULES)) {
    return naturalPlan(PLAN_TEXT.requestedToolPanelOpen, [toolOpenAction]);
  }

  const deskCapturePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_CAPTURE_RULES);
  if (deskCapturePlan) return deskCapturePlan;

  const activeDockFocusPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
    DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockFocusPlan) return activeDockFocusPlan;

  const activeDockClosePlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
    DESK_ACTION_ARGS.useActive(),
  );
  if (activeDockClosePlan) return activeDockClosePlan;

  const dockSide = detectXenesisNaturalDockSide(value);
  const dockSize = extractXenesisNaturalDockSize(value);
  const dockSizeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_SIZE_RULES);
  if (dockSizeRule?.visibleText && dockSide && dockSize) {
    return naturalPlan(dockSizeRule.visibleText, [
      buildXenesisNaturalCatalogAction(dockSizeRule.action, DESK_ACTION_ARGS.dockSize(dockSide, dockSize)),
    ]);
  }

  const presetId = detectXenesisNaturalWindowSizePreset(value);
  const windowSizeRule = presetId
    ? naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES)
    : null;
  if (presetId && windowSizeRule) {
    return naturalPlan(PLAN_TEXT.windowSizePreset(presetId), [
      buildXenesisNaturalCatalogAction(windowSizeRule.action, DESK_ACTION_ARGS.presetId(presetId)),
    ]);
  }

  const deskFileListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_FILE_LIST_RULES);
  if (deskFileListPlan) return deskFileListPlan;

  const filePath = extractXenesisNaturalLocalPath(rawText);
  const deskFilePathPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DESK_FILE_PATH_RULES,
    DESK_ACTION_ARGS.optionalFilePath(filePath),
  );
  if (deskFilePathPlan) return deskFilePathPlan;

  const explorerFilterRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_FILTER_RULES);
  if (explorerFilterRule?.visibleText) {
    const query = extractXenesisNaturalFilterQuery(rawText);
    return naturalPlan(explorerFilterRule.visibleText, [
      buildXenesisNaturalCatalogAction(explorerFilterRule.action, DESK_ACTION_ARGS.filterQuery(query)),
    ]);
  }

  const explorerPath = extractXenesisNaturalLocalPath(rawText);
  const explorerNavigateRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES);
  if (explorerNavigateRule?.visibleText && explorerPath) {
    return naturalPlan(explorerNavigateRule.visibleText, [
      buildXenesisNaturalCatalogAction(explorerNavigateRule.action, DESK_ACTION_ARGS.explorerPath(explorerPath)),
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
      buildXenesisNaturalCatalogAction(terminalManyRule.action, DESK_ACTION_ARGS.terminalMany(count, placement)),
    ];
    const arrangeMode = detectXenesisNaturalArrangeMode(value);
    const terminalArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
    if (arrangeMode && terminalArrangeRule) {
      actions.push(
        buildXenesisNaturalCatalogAction(
          terminalArrangeRule.action,
          DESK_ACTION_ARGS.dockWindowArrange(detectXenesisNaturalDockWindowState(value), arrangeMode),
        ),
      );
    }
    return naturalPlan(terminalManyRule.visibleText, actions);
  }

  const terminalRunRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_TERMINAL_RUN_RULES);
  if (terminalRunRule?.visibleText) {
    const command = extractXenesisNaturalTerminalCommand(rawText);
    return naturalPlan(terminalRunRule.visibleText, [
      buildXenesisNaturalCatalogAction(terminalRunRule.action, DESK_ACTION_ARGS.terminalRun(command, placement)),
    ]);
  }

  const scopedArrangeMode = detectXenesisNaturalArrangeMode(value);
  const windowState = detectXenesisNaturalDockWindowState(value);
  const windowArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
  if (scopedArrangeMode && windowState && windowArrangeRule?.visibleText) {
    return naturalPlan(windowArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(
        windowArrangeRule.action,
        DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
      ),
    ]);
  }

  const paneArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES);
  if (scopedArrangeMode && paneArrangeRule?.visibleText) {
    return naturalPlan(paneArrangeRule.visibleText, [
      buildXenesisNaturalCatalogAction(paneArrangeRule.action, DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode)),
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
    DESK_ACTION_ARGS.useActive(),
  );
  if (dockPaneMergePlan) return dockPaneMergePlan;

  const dockGroupMergePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES);
  if (dockGroupMergePlan) return dockGroupMergePlan;

  const dockPanesListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_PANES_LIST_RULES);
  if (dockPanesListPlan) return dockPanesListPlan;

  const artifactTargetPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
    DESK_ACTION_ARGS.useActive(),
  );
  if (artifactTargetPlan) return artifactTargetPlan;

  const view = viewKindFromNaturalText(value);
  if (view && matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES)) {
    return naturalPlan(PLAN_TEXT.requestedViewOpen, [buildXenesisNaturalViewOpenAction(view, placement)]);
  }

  return emptyNaturalPlan();
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  return parseXenesisDeskActionBlocksFromCatalog(text);
}

export function shouldRunXenesisDeskActionsDirectly(parsed: XenesisDeskActionParseResult): boolean {
  return shouldRunXenesisDeskActionsDirectlyFromCatalog(parsed);
}

export async function runXenesisDeskActions(
  actions: XenesisDeskActionRequest[],
  executor: XenesisDeskActionExecutor,
  options: XenesisDeskActionRunOptions = {},
): Promise<XenesisDeskActionExecutionResult[]> {
  const results: XenesisDeskActionExecutionResult[] = [];
  const reportActivity = (activity: XenesisDeskActionActivity): void => {
    try {
      options.onActivity?.(activity);
    } catch {
      // Activity reporting is observational and must not affect Desk action execution.
    }
  };

  for (const action of actions) {
    reportActivity({ phase: DESK_ACTION_ACTIVITY_PHASES.start, action });
    try {
      const callResult = await executor(action.path, action.args, { approved: action.approved });
      const callError = callResult[DESK_ACTION_CALL_RESULT_KEYS.error];
      const callApprovalRequired = callResult[DESK_ACTION_CALL_RESULT_KEYS.approvalRequired];
      const callPermission = callResult[DESK_ACTION_CALL_RESULT_KEYS.permission];
      const callApproval = callResult[DESK_ACTION_CALL_RESULT_KEYS.approval];
      const callSource = callResult[DESK_ACTION_CALL_RESULT_KEYS.source];
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: DESK_ACTION_EXECUTION_STATUS.isOk(callResult[DESK_ACTION_CALL_RESULT_KEYS.ok]),
        result: callResult[DESK_ACTION_CALL_RESULT_KEYS.result] ?? callResult,
        ...(callError ? { error: callError } : {}),
        ...(callApprovalRequired ? { approvalRequired: callApprovalRequired } : {}),
        ...(callPermission ? { permission: callPermission } : {}),
        ...(callApproval ? { approval: callApproval } : {}),
        ...(callSource ? { source: callSource } : {}),
      };
      results.push(result);
      reportActivity({
        phase: isXenesisDeskActionApprovalRequiredResult(result)
          ? DESK_ACTION_ACTIVITY_PHASES.approvalRequired
          : result.ok
            ? DESK_ACTION_ACTIVITY_PHASES.success
            : DESK_ACTION_ACTIVITY_PHASES.failure,
        action,
        result,
        ...(result[DESK_ACTION_CALL_RESULT_KEYS.error] ? { error: result[DESK_ACTION_CALL_RESULT_KEYS.error] } : {}),
      });
    } catch (error) {
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: DESK_ACTION_EXECUTION_STATUS.failed,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      reportActivity({
        phase: DESK_ACTION_ACTIVITY_PHASES.failure,
        action,
        result,
        error: result[DESK_ACTION_CALL_RESULT_KEYS.error],
      });
    }
  }
  return results;
}

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionExecutionResult): boolean {
  return isXenesisDeskActionApprovalRequiredResultFromCatalog(result);
}

export function pendingXenesisDeskActionsFromResults(
  actions: XenesisDeskActionRequest[],
  results: XenesisDeskActionExecutionResult[],
): XenesisDeskActionRequest[] {
  return pendingXenesisDeskActionsFromResultsFromCatalog(actions, results);
}

export function approveXenesisDeskActions(actions: XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return approveXenesisDeskActionsFromCatalog(actions);
}

export function buildXenesisDeskActionPendingMessage(
  actions: XenesisDeskActionRequest[],
  leadText: string = DESK_ACTION_PROTOCOL_FORMAT.emptyText,
): string {
  return buildXenesisDeskActionPendingMessageFromCatalog(actions, leadText);
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  return buildXenesisDeskActionCompletedMessageFromCatalog(results);
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return summarizeXenesisDeskActionExecutionFromCatalog(result);
}

export function buildXenesisDeskControlPromptHint(): string {
  return buildXenesisDeskControlPromptHintFromShared();
}
