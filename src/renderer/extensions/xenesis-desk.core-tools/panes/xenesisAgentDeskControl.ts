import { listDeskBridgeCapabilities } from '../../../../shared/deskBridgeCapabilities';
import {
  findXenesisNaturalGuideTarget,
  findXenesisNaturalWordsTarget,
  isXenesisDeskActionRecordValue,
  isXenesisDeskActionValueType,
  isXenesisNaturalConnectionMessengerTarget,
  isXenesisNaturalConnectionToolTarget,
  isXenesisNaturalPlannedGoogleToolTarget,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_APPROVAL_STATE,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_EXECUTION_STATUS,
  XENESIS_DESK_ACTION_PROTOCOL,
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  XENESIS_DESK_ACTION_PROTOCOL_PATTERNS,
  XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS,
  XENESIS_DESK_ACTION_PROTOCOL_TEXT,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT,
  XENESIS_DESK_ACTION_VALUE_TYPE_NAMES,
  XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX,
  XENESIS_NATURAL_ACTION_INTENT_WORDS,
  XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
  XENESIS_NATURAL_AGENT_READBACK_RULES,
  XENESIS_NATURAL_AGENT_SUBMIT_RULES,
  XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_ARRANGE_MODE_TARGETS,
  XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
  XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
  XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES,
  XENESIS_NATURAL_CONNECTION_TARGETS,
  XENESIS_NATURAL_CORE_TOOL_OPEN_REASON,
  XENESIS_NATURAL_CORE_TOOL_TARGETS,
  XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS,
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
  XENESIS_NATURAL_DOCK_SIDE_TARGETS,
  XENESIS_NATURAL_DOCK_SIZE_RULES,
  XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES,
  XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES,
  XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS,
  XENESIS_NATURAL_EXPLICIT_OPEN_WORDS,
  XENESIS_NATURAL_EXPLORER_FILTER_RULES,
  XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES,
  XENESIS_NATURAL_EXPLORER_SIMPLE_RULES,
  XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTRACTION_PATTERNS,
  XENESIS_NATURAL_GATEWAY_ACTION_RULES,
  XENESIS_NATURAL_GENERIC_OPEN_WORDS,
  XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS,
  XENESIS_NATURAL_GUIDE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_STATUS_RULES,
  XENESIS_NATURAL_INTENT_PATTERNS,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_NUMERIC_LIMITS,
  XENESIS_NATURAL_ONBOARDING_OPEN_RULES,
  XENESIS_NATURAL_ONBOARDING_STATUS_RULES,
  XENESIS_NATURAL_ONBOARDING_STEP_TARGETS,
  XENESIS_NATURAL_OPEN_COMMAND_WORDS,
  XENESIS_NATURAL_OPEN_OR_SHOW_WORDS,
  XENESIS_NATURAL_PLACEMENT_TARGETS,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_INVENTORY_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_PROVIDER_AUTO_TARGET,
  XENESIS_NATURAL_PROVIDER_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_STATUS_RULES,
  XENESIS_NATURAL_PROVIDER_TARGETS,
  XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS,
  XENESIS_NATURAL_RUN_START_RULES,
  XENESIS_NATURAL_RUNTIME_CONTROL_RULES,
  XENESIS_NATURAL_RUNTIME_INVENTORY_RULES,
  XENESIS_NATURAL_RUNTIME_SUPPORT_RULES,
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS,
  XENESIS_NATURAL_VIEW_OPEN_PATH,
  XENESIS_NATURAL_VIEW_TARGETS,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS,
  XENESIS_NATURAL_WORKSPACE_SET_RULES,
  type XenesisDeskActionActivityPhase as XenesisDeskActionActivityPhaseCatalog,
  type XenesisNaturalArrangeModeId as XenesisDeskArrangeMode,
  type XenesisNaturalDockSideId as XenesisDeskDockSide,
  type XenesisNaturalPlacementId as XenesisDeskPlacement,
  type XenesisNaturalDockWindowStateId as XenesisDeskWindowState,
  type XenesisNaturalCatalogActionRule,
  type XenesisNaturalConnectionAggregateOpenRuleStage,
  type XenesisNaturalConnectionAggregateRuleMatchKind,
  type XenesisNaturalConnectionAggregateStatusRuleStage,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalConnectionTargetActionRule,
  type XenesisNaturalCoreToolTarget,
  type XenesisNaturalDeskActionDescriptor,
  type XenesisNaturalDeskActionTemplateDescriptor,
  type XenesisNaturalGuideOpenRule,
  type XenesisNaturalGuideStatusRule,
  type XenesisNaturalOnboardingActionRule,
  type XenesisNaturalProviderActionRule,
} from '../../../../shared/xenesisNaturalLanguageCatalog';

export interface XenesisDeskActionRequest {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  reason?: string;
}

export interface XenesisDeskActionParseResult {
  visibleText: string;
  actions: XenesisDeskActionRequest[];
  errors: string[];
}

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

function normalizeNaturalLanguageText(value: string): string {
  return String(value || NATURAL_TEXT_DEFAULTS.empty)
    .normalize(NATURAL_TEXT_DEFAULTS.unicodeNormalizationForm)
    .replace(EXTRACTION_PATTERNS.normalizedWhitespace, NATURAL_TEXT_DEFAULTS.wordSeparator)
    .trim()
    .toLowerCase();
}

function hasAny(value: string, words: readonly string[]): boolean {
  return words.some((word) => value.includes(word));
}

function hasExplicitOpenIntent(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_EXPLICIT_OPEN_WORDS) || INTENT_PATTERNS.explicitOpenEnglish.test(value);
}

function hasActionIntent(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_ACTION_INTENT_WORDS);
}

function naturalAction(id: string, path: string, args: unknown, reason: string): XenesisDeskActionRequest {
  return { id, path, args, approved: DESK_ACTION_APPROVAL_STATE.pending, reason };
}

function naturalCatalogAction(
  descriptor: XenesisNaturalDeskActionDescriptor,
  args: unknown = DESK_ACTION_ARGS.empty(),
): XenesisDeskActionRequest {
  return naturalAction(descriptor.id, descriptor.path, args, descriptor.reason);
}

function naturalTemplateAction<TArgs extends unknown[]>(
  descriptor: XenesisNaturalDeskActionTemplateDescriptor<TArgs>,
  templateArgs: TArgs,
  args: unknown,
): XenesisDeskActionRequest {
  return naturalAction(descriptor.idFor(...templateArgs), descriptor.path, args, descriptor.reasonFor(...templateArgs));
}

function naturalCoreToolOpenAction(
  definition: XenesisNaturalCoreToolTarget,
  placement: XenesisDeskPlacement | undefined,
): XenesisDeskActionRequest {
  return {
    id: definition.id,
    path: definition.path,
    args: DESK_ACTION_ARGS.placement(placement || DEFAULT_DESK_PLACEMENT),
    approved: DESK_ACTION_APPROVAL_STATE.pending,
    reason: CORE_TOOL_OPEN_REASON(definition.reasonName),
  };
}

function naturalViewOpenAction(
  view: { id: string; kind: string; reason: string },
  placement: XenesisDeskPlacement | undefined,
): XenesisDeskActionRequest {
  return {
    id: view.id,
    path: XENESIS_NATURAL_VIEW_OPEN_PATH,
    args: DESK_ACTION_ARGS.withPlacement(DESK_ACTION_ARGS.viewKind(view.kind), placement || DEFAULT_DESK_PLACEMENT),
    approved: DESK_ACTION_APPROVAL_STATE.pending,
    reason: view.reason,
  };
}

type XenesisNaturalContextRule = Pick<
  XenesisNaturalCatalogActionRule,
  'blockedContextWords' | 'contextWords' | 'requiredContextWordGroups'
>;

function naturalRuleMatches(value: string, rule: XenesisNaturalContextRule): boolean {
  if (rule.contextWords.length > 0 && !hasAny(value, rule.contextWords)) return false;
  if ((rule.requiredContextWordGroups ?? []).some((contextWords) => !hasAny(value, contextWords))) return false;
  if (rule.blockedContextWords && hasAny(value, rule.blockedContextWords)) return false;
  return true;
}

function naturalContextRuleFromNaturalText<TRule extends XenesisNaturalContextRule>(
  value: string,
  rules: readonly TRule[],
): TRule | null {
  for (const rule of rules) {
    if (!naturalRuleMatches(value, rule)) continue;
    return rule;
  }

  return null;
}

function naturalCatalogRuleFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
): XenesisNaturalCatalogActionRule | null {
  return naturalContextRuleFromNaturalText(value, rules);
}

function naturalCatalogRuleActionFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = DESK_ACTION_ARGS.empty(),
): XenesisDeskActionRequest | null {
  const rule = naturalCatalogRuleFromNaturalText(value, rules);
  return rule ? naturalCatalogAction(rule.action, args) : null;
}

function naturalCatalogRulePlanFromNaturalText(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = DESK_ACTION_ARGS.empty(),
): XenesisDeskNaturalLanguagePlan | null {
  const rule = naturalCatalogRuleFromNaturalText(value, rules);
  if (!rule?.visibleText) return null;
  return naturalPlan(rule.visibleText, [naturalCatalogAction(rule.action, args)]);
}

const DESK_ACTION_ACTIVITY_PHASES = XENESIS_DESK_ACTION_ACTIVITY_PHASES;
const DESK_ACTION_APPROVAL_STATE = XENESIS_DESK_ACTION_APPROVAL_STATE;
const DESK_ACTION_CALL_RESULT_KEYS = XENESIS_DESK_ACTION_CALL_RESULT_KEYS;
const DESK_ACTION_EXECUTION_STATUS = XENESIS_DESK_ACTION_EXECUTION_STATUS;
const DESK_ACTION_PROTOCOL = XENESIS_DESK_ACTION_PROTOCOL;
const DESK_ACTION_PROTOCOL_FORMAT = XENESIS_DESK_ACTION_PROTOCOL_FORMAT;
const DESK_ACTION_PROTOCOL_PATTERNS = XENESIS_DESK_ACTION_PROTOCOL_PATTERNS;
const DESK_ACTION_PROTOCOL_RECORD_KEYS = XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS;
const DESK_ACTION_PROTOCOL_TEXT = XENESIS_DESK_ACTION_PROTOCOL_TEXT;
const DESK_ACTION_RESULT_SUMMARY_KEYS = XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS;
const DESK_ACTION_RESULT_SUMMARY_PATHS = XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS;
const DESK_ACTION_RESULT_SUMMARY_TEXT = XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT;
const DESK_ACTION_VALUE_TYPE_NAMES = XENESIS_DESK_ACTION_VALUE_TYPE_NAMES;
const DESK_ACTION_ARG_DEFAULTS = XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS;
const DESK_ACTION_ARGS = XENESIS_NATURAL_DESK_ACTION_ARGS;
const DEFAULT_DESK_PLACEMENT = DESK_ACTION_ARG_DEFAULTS.placement;
const EXTRACTION_PATTERNS = XENESIS_NATURAL_EXTRACTION_PATTERNS;
const CORE_TOOL_OPEN_REASON = XENESIS_NATURAL_CORE_TOOL_OPEN_REASON;
const INTENT_PATTERNS = XENESIS_NATURAL_INTENT_PATTERNS;
const NATURAL_NUMERIC_LIMITS = XENESIS_NATURAL_NUMERIC_LIMITS;
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

function detectPlacement(value: string): XenesisDeskPlacement | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PLACEMENT_TARGETS)?.id as
    | XenesisDeskPlacement
    | undefined;
}

function detectWindowSizerPreset(value: string): string | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS)?.id;
}

function extractFirstInteger(
  value: string,
  min: number = NATURAL_NUMERIC_LIMITS.firstInteger.min,
  max: number = NATURAL_NUMERIC_LIMITS.firstInteger.max,
): number | undefined {
  const match = String(value || NATURAL_TEXT_DEFAULTS.empty).match(EXTRACTION_PATTERNS.firstInteger);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0] || NATURAL_TEXT_DEFAULTS.empty, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(max, parsed));
}

function detectDockSide(value: string): XenesisDeskDockSide | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_DOCK_SIDE_TARGETS)?.id as XenesisDeskDockSide | undefined;
}

function detectDockWindowState(value: string): XenesisDeskWindowState | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS)?.id as
    | XenesisDeskWindowState
    | undefined;
}

function detectArrangeMode(value: string): XenesisDeskArrangeMode | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ARRANGE_MODE_TARGETS)?.id as
    | XenesisDeskArrangeMode
    | undefined;
}

function stripQuotedText(value: string): string {
  return String(value || NATURAL_TEXT_DEFAULTS.empty).replace(
    EXTRACTION_PATTERNS.quotedText,
    NATURAL_TEXT_DEFAULTS.wordSeparator,
  );
}

function extractQuotedTexts(value: string): string[] {
  const texts: string[] = [];
  for (const match of String(value || NATURAL_TEXT_DEFAULTS.empty).matchAll(EXTRACTION_PATTERNS.quotedText)) {
    const quoted = match[1]?.trim();
    if (quoted) texts.push(quoted);
  }
  return texts;
}

function extractQuotedText(value: string): string {
  return extractQuotedTexts(value)[NATURAL_TEXT_DEFAULTS.firstItemIndex] || NATURAL_TEXT_DEFAULTS.empty;
}

function extractLocalPath(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const windowsPath = value.match(EXTRACTION_PATTERNS.localWindowsPath);
  if (windowsPath?.[0]) {
    return windowsPath[0].trim().replace(EXTRACTION_PATTERNS.trailingPathPunctuation, NATURAL_TEXT_DEFAULTS.empty);
  }
  const unixPath = value.match(EXTRACTION_PATTERNS.localUnixPath);
  return (
    unixPath?.[0]?.trim().replace(EXTRACTION_PATTERNS.trailingPathPunctuation, NATURAL_TEXT_DEFAULTS.empty) ||
    NATURAL_TEXT_DEFAULTS.empty
  );
}

function extractFilterQuery(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const cleaned = value
    .replace(EXTRACTION_PATTERNS.filterQueryWords, NATURAL_TEXT_DEFAULTS.wordSeparator)
    .replace(EXTRACTION_PATTERNS.normalizedWhitespace, NATURAL_TEXT_DEFAULTS.wordSeparator)
    .trim();
  const parts = cleaned.split(NATURAL_TEXT_DEFAULTS.wordSeparator).filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function extractTerminalCommand(rawText: string): string {
  const quoted = extractQuotedText(rawText);
  if (quoted) return quoted;
  return String(rawText || NATURAL_TEXT_DEFAULTS.empty)
    .replace(EXTRACTION_PATTERNS.terminalCommandPrefix, NATURAL_TEXT_DEFAULTS.empty)
    .replace(EXTRACTION_PATTERNS.terminalCommandSuffix, NATURAL_TEXT_DEFAULTS.empty)
    .replace(EXTRACTION_PATTERNS.terminalCommandTrim, NATURAL_TEXT_DEFAULTS.empty)
    .trim();
}

function toolOpenActionFromNaturalText(
  value: string,
  placement: XenesisDeskPlacement | undefined,
): XenesisDeskActionRequest | null {
  const definition = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CORE_TOOL_TARGETS);
  if (!definition) return null;
  return naturalCoreToolOpenAction(definition, placement);
}

function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
  const target = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_VIEW_TARGETS);
  if (!target) return null;
  return { id: target.id, kind: target.kind, reason: target.reason };
}

function xenesisConnectionTargetFromNaturalText(value: string): XenesisNaturalConnectionTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CONNECTION_TARGETS);
}

function xenesisConnectionTargetMatchesRule(
  target: XenesisNaturalConnectionTarget,
  rule: XenesisNaturalConnectionTargetActionRule,
): boolean {
  if (rule.targetScope === 'any') return true;
  if (rule.targetScope === 'tool') return isXenesisNaturalConnectionToolTarget(target);
  if (rule.targetScope === 'messenger') return isXenesisNaturalConnectionMessengerTarget(target);
  return isXenesisNaturalPlannedGoogleToolTarget(target);
}

function xenesisConnectionTargetArgsForRule(
  rule: XenesisNaturalConnectionTargetActionRule,
  target: XenesisNaturalConnectionTarget,
): unknown {
  if (rule.argsKind === 'targetId') return DESK_ACTION_ARGS.targetId(target.id);
  if (rule.argsKind === 'targetIdVisible') return DESK_ACTION_ARGS.targetIdVisible(target.id);
  if (rule.argsKind === 'tool') return DESK_ACTION_ARGS.tool(target.id);
  if (rule.argsKind === 'channelVisible') return DESK_ACTION_ARGS.channelVisible(target.id);
  return DESK_ACTION_ARGS.channel(target.id);
}

function xenesisConnectionTargetRuleActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
  rules: readonly XenesisNaturalConnectionTargetActionRule[],
): XenesisDeskActionRequest | null {
  for (const rule of rules) {
    if (!xenesisConnectionTargetMatchesRule(target, rule)) continue;
    if (rule.contextWords.length > 0 && !hasAny(value, rule.contextWords)) continue;
    return naturalTemplateAction(
      rule.action,
      [target.id, target.label],
      xenesisConnectionTargetArgsForRule(rule, target),
    );
  }

  return null;
}

function xenesisConnectionTargetStatusActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisDeskActionRequest | null {
  return xenesisConnectionTargetRuleActionFromNaturalText(
    value,
    target,
    XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES,
  );
}

function xenesisConnectionTargetOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisDeskActionRequest | null {
  return xenesisConnectionTargetRuleActionFromNaturalText(value, target, XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES);
}

function xenesisProviderArgsForRule(
  rule: XenesisNaturalProviderActionRule,
  provider: { id: string; label: string },
): unknown {
  if (rule.argsKind === 'providerVisible') return DESK_ACTION_ARGS.providerVisible(provider.id);
  return DESK_ACTION_ARGS.provider(provider.id);
}

function xenesisProviderRuleActionFromNaturalText(
  value: string,
  provider: { id: string; label: string },
  rules: readonly XenesisNaturalProviderActionRule[],
): XenesisDeskActionRequest | null {
  for (const rule of rules) {
    if (rule.contextWords.length > 0 && !hasAny(value, rule.contextWords)) continue;
    return naturalTemplateAction(
      rule.action,
      [provider.id, provider.label],
      xenesisProviderArgsForRule(rule, provider),
    );
  }

  return null;
}

function xenesisGuideFromNaturalText(
  value: string,
  rule: XenesisNaturalGuideOpenRule | XenesisNaturalGuideStatusRule,
): { id: string; label: string } | null {
  if (!naturalRuleMatches(value, rule)) return null;

  return findXenesisNaturalGuideTarget(value);
}

function xenesisGuideActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const rule = naturalContextRuleFromNaturalText(value, XENESIS_NATURAL_GUIDE_OPEN_RULES);
  if (!rule) return null;

  const guide = xenesisGuideFromNaturalText(value, rule);
  if (!guide) return null;

  const openFile = hasAny(value, XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS);

  return naturalTemplateAction(
    rule.action,
    [guide.id, guide.label, openFile],
    DESK_ACTION_ARGS.openFileVisible(guide.id, openFile),
  );
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const rule = naturalContextRuleFromNaturalText(value, XENESIS_NATURAL_GUIDE_STATUS_RULES);
  if (!rule) return null;

  const guide = xenesisGuideFromNaturalText(value, rule);
  if (!guide) return null;

  return naturalTemplateAction(rule.action, [guide.id, guide.label], DESK_ACTION_ARGS.targetId(guide.id));
}

function hasXenesisOnboardingContext(value: string): boolean {
  return (
    naturalContextRuleFromNaturalText(value, XENESIS_NATURAL_ONBOARDING_OPEN_RULES) !== null ||
    naturalContextRuleFromNaturalText(value, XENESIS_NATURAL_ONBOARDING_STATUS_RULES) !== null
  );
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasXenesisOnboardingContext(value)) return null;

  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS);
}

function xenesisOnboardingArgsForRule(rule: XenesisNaturalOnboardingActionRule, id?: string): unknown {
  if (rule.argsKind === 'ensureVisible') return DESK_ACTION_ARGS.ensureVisible();
  if (rule.argsKind === 'targetIdVisible') return DESK_ACTION_ARGS.targetIdVisible(id || NATURAL_TEXT_DEFAULTS.empty);
  return DESK_ACTION_ARGS.targetId(id || NATURAL_TEXT_DEFAULTS.empty);
}

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  for (const rule of XENESIS_NATURAL_ONBOARDING_OPEN_RULES) {
    if (!naturalRuleMatches(value, rule)) continue;

    if (rule.targetRequired) {
      if (!step) continue;

      return naturalTemplateAction(rule.action, [step.id, step.label], xenesisOnboardingArgsForRule(rule, step.id));
    }

    return naturalCatalogAction(rule.action, xenesisOnboardingArgsForRule(rule));
  }

  return null;
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  for (const rule of XENESIS_NATURAL_ONBOARDING_STATUS_RULES) {
    if (!naturalRuleMatches(value, rule)) continue;
    if (!rule.targetRequired) continue;

    return naturalTemplateAction(rule.action, [step.id, step.label], xenesisOnboardingArgsForRule(rule, step.id));
  }

  return null;
}

function hasXenesisConnectionReadbackIntent(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS);
}

function hasExternalToolCatalogContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS);
}

function hasExternalMessengerCatalogContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS);
}

function hasXenesisAggregateCatalogContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS);
}

function hasXenesisGuideCatalogContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_GUIDE_CONTEXT_WORDS) && hasXenesisAggregateCatalogContext(value);
}

function hasXenesisConnectionDiagnosticsCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS)
  );
}

function hasXenesisConnectionSetupRequestCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS) &&
    (hasXenesisConnectionContext(value) || hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS))
  );
}

function hasXenesisMessengerProfileDraftCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS) &&
    (hasExternalMessengerCatalogContext(value) || hasAny(value, XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS))
  );
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

function hasXenesisConnectionContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS);
}

function xenesisConnectionAggregateRuleMatches(
  value: string,
  matchKind: XenesisNaturalConnectionAggregateRuleMatchKind,
): boolean {
  switch (matchKind) {
    case 'guideCatalog':
      return hasXenesisGuideCatalogContext(value);
    case 'diagnosticsCatalog':
      return hasXenesisConnectionDiagnosticsCatalogContext(value);
    case 'setupRequestCatalog':
      return hasXenesisConnectionSetupRequestCatalogContext(value);
    case 'onboarding':
      return hasXenesisOnboardingContext(value);
    case 'guideContext':
      return hasAny(value, XENESIS_NATURAL_GUIDE_CONTEXT_WORDS);
    case 'connectionContext':
      return hasXenesisConnectionContext(value);
    case 'connectionCenterOpen':
      return hasAny(value, XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS);
  }
}

function xenesisConnectionAggregateStatusRuleActionFromNaturalText(
  value: string,
  stage: XenesisNaturalConnectionAggregateStatusRuleStage,
): XenesisDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES) {
    if (rule.stage !== stage) continue;
    if (!xenesisConnectionAggregateRuleMatches(value, rule.matchKind)) continue;
    return naturalCatalogAction(rule.action);
  }

  return null;
}

function xenesisConnectionAggregateOpenRuleActionFromNaturalText(
  value: string,
  stage: XenesisNaturalConnectionAggregateOpenRuleStage,
): XenesisDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES) {
    if (rule.stage !== stage) continue;
    if (!xenesisConnectionAggregateRuleMatches(value, rule.matchKind)) continue;
    return naturalCatalogAction(rule.action, DESK_ACTION_ARGS.ensureVisible());
  }

  return null;
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PROVIDER_TARGETS);
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

  return xenesisProviderRuleActionFromNaturalText(value, provider, XENESIS_NATURAL_PROVIDER_STATUS_RULES);
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

  const earlyConnectionAggregateStatusAction = xenesisConnectionAggregateStatusRuleActionFromNaturalText(
    value,
    'early',
  );
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

    const onboardingAggregateStatusAction = xenesisConnectionAggregateStatusRuleActionFromNaturalText(value, 'late');
    if (onboardingAggregateStatusAction) return onboardingAggregateStatusAction;
  }

  return xenesisConnectionAggregateStatusRuleActionFromNaturalText(value, 'late');
}

function hasXenesisConnectionReviewRequestIntent(value: string): boolean {
  if (hasAny(value, XENESIS_NATURAL_GENERIC_OPEN_WORDS)) return false;
  if (hasXenesisConnectionReadbackIntent(value)) return false;
  const hasExplicitRequest = hasAny(value, XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS);
  const hasSetupImperative = hasAny(value, XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS);
  if (!hasExplicitRequest && !hasSetupImperative) return false;
  return (
    hasAny(value, XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS) ||
    hasXenesisConnectionContext(value) ||
    hasAny(value, XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS)
  );
}

function hasXenesisProviderProfileContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS);
}

function xenesisConnectionReviewRequestActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReviewRequestIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (provider) {
    const providerReviewRequestAction = xenesisProviderRuleActionFromNaturalText(
      value,
      provider,
      XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
    );
    if (providerReviewRequestAction) return providerReviewRequestAction;
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return xenesisConnectionTargetRuleActionFromNaturalText(value, target, XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES);
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return xenesisProviderRuleActionFromNaturalText(value, provider, XENESIS_NATURAL_PROVIDER_OPEN_RULES);
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  return xenesisConnectionAggregateOpenRuleActionFromNaturalText(value, 'guide');
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

  const lateConnectionAggregateOpenAction = xenesisConnectionAggregateOpenRuleActionFromNaturalText(value, 'late');
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
  const agentId = extractQuotedText(rawText);
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
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  const [agentId, text] = extractQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return naturalCatalogRuleActionFromNaturalText(
    intentValue,
    XENESIS_NATURAL_AGENT_SUBMIT_RULES,
    DESK_ACTION_ARGS.agentSubmit(agentId, text),
  );
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  const prompt = extractQuotedText(rawText);
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
  const path = extractLocalPath(rawText);
  if (!path) return null;

  return naturalCatalogRuleActionFromNaturalText(
    value,
    XENESIS_NATURAL_WORKSPACE_SET_RULES,
    DESK_ACTION_ARGS.workspacePath(path),
  );
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || NATURAL_TEXT_DEFAULTS.empty).trim();
  const value = normalizeNaturalLanguageText(rawText);
  if (!value || !hasActionIntent(value)) return emptyNaturalPlan();

  const placement = detectPlacement(value);

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
  if (explicitXenesisConnectionOpenAction && hasAny(value, XENESIS_NATURAL_OPEN_COMMAND_WORDS)) {
    return naturalPlan(PLAN_TEXT.connectionSurfaceOpen, [explicitXenesisConnectionOpenAction]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return naturalPlan(PLAN_TEXT.connectionStatusRead, [xenesisConnectionReadbackAction]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
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
  if (toolOpenAction && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
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

  const dockSide = detectDockSide(value);
  const dockSize = extractFirstInteger(value, NATURAL_NUMERIC_LIMITS.dockSize.min, NATURAL_NUMERIC_LIMITS.dockSize.max);
  const dockSizeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_SIZE_RULES);
  if (dockSizeRule?.visibleText && dockSide && dockSize) {
    return naturalPlan(dockSizeRule.visibleText, [
      naturalCatalogAction(dockSizeRule.action, DESK_ACTION_ARGS.dockSize(dockSide, dockSize)),
    ]);
  }

  const presetId = detectWindowSizerPreset(value);
  const windowSizeRule = presetId
    ? naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES)
    : null;
  if (presetId && windowSizeRule) {
    return naturalPlan(PLAN_TEXT.windowSizePreset(presetId), [
      naturalCatalogAction(windowSizeRule.action, DESK_ACTION_ARGS.presetId(presetId)),
    ]);
  }

  const deskFileListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_FILE_LIST_RULES);
  if (deskFileListPlan) return deskFileListPlan;

  const filePath = extractLocalPath(rawText);
  const deskFilePathPlan = naturalCatalogRulePlanFromNaturalText(
    value,
    XENESIS_NATURAL_DESK_FILE_PATH_RULES,
    DESK_ACTION_ARGS.optionalFilePath(filePath),
  );
  if (deskFilePathPlan) return deskFilePathPlan;

  const explorerFilterRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_FILTER_RULES);
  if (explorerFilterRule?.visibleText) {
    const query = extractFilterQuery(rawText);
    return naturalPlan(explorerFilterRule.visibleText, [
      naturalCatalogAction(explorerFilterRule.action, DESK_ACTION_ARGS.filterQuery(query)),
    ]);
  }

  const explorerPath = extractLocalPath(rawText);
  const explorerNavigateRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES);
  if (explorerNavigateRule?.visibleText && explorerPath) {
    return naturalPlan(explorerNavigateRule.visibleText, [
      naturalCatalogAction(explorerNavigateRule.action, DESK_ACTION_ARGS.explorerPath(explorerPath)),
    ]);
  }

  const explorerSimplePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_EXPLORER_SIMPLE_RULES);
  if (explorerSimplePlan) return explorerSimplePlan;

  const deskMiscReadPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DESK_MISC_READ_RULES);
  if (deskMiscReadPlan) return deskMiscReadPlan;

  const terminalListPlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_TERMINAL_LIST_RULES);
  if (terminalListPlan) return terminalListPlan;

  const count = extractFirstInteger(
    value,
    NATURAL_NUMERIC_LIMITS.terminalCount.min,
    NATURAL_NUMERIC_LIMITS.terminalCount.max,
  );
  const terminalManyRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_TERMINAL_MANY_RULES);
  if (terminalManyRule?.visibleText && count && count > 1) {
    const actions = [naturalCatalogAction(terminalManyRule.action, DESK_ACTION_ARGS.terminalMany(count, placement))];
    const arrangeMode = detectArrangeMode(value);
    const terminalArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
    if (arrangeMode && terminalArrangeRule) {
      actions.push(
        naturalCatalogAction(
          terminalArrangeRule.action,
          DESK_ACTION_ARGS.dockWindowArrange(detectDockWindowState(value), arrangeMode),
        ),
      );
    }
    return naturalPlan(terminalManyRule.visibleText, actions);
  }

  const terminalRunRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_TERMINAL_RUN_RULES);
  if (terminalRunRule?.visibleText) {
    const command = extractTerminalCommand(rawText);
    return naturalPlan(terminalRunRule.visibleText, [
      naturalCatalogAction(terminalRunRule.action, DESK_ACTION_ARGS.terminalRun(command, placement)),
    ]);
  }

  const scopedArrangeMode = detectArrangeMode(value);
  const windowState = detectDockWindowState(value);
  const windowArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES);
  if (scopedArrangeMode && windowState && windowArrangeRule?.visibleText) {
    return naturalPlan(windowArrangeRule.visibleText, [
      naturalCatalogAction(
        windowArrangeRule.action,
        DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
      ),
    ]);
  }

  const paneArrangeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES);
  if (scopedArrangeMode && paneArrangeRule?.visibleText) {
    return naturalPlan(paneArrangeRule.visibleText, [
      naturalCatalogAction(paneArrangeRule.action, DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode)),
    ]);
  }

  const dockGroupArrangePlan = naturalCatalogRulePlanFromNaturalText(value, XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES);
  if (dockGroupArrangePlan) return dockGroupArrangePlan;

  const dockWindowMergeRule = naturalCatalogRuleFromNaturalText(value, XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES);
  if (windowState && dockWindowMergeRule?.visibleText) {
    return naturalPlan(dockWindowMergeRule.visibleText, [
      naturalCatalogAction(dockWindowMergeRule.action, { windowState }),
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
  if (view && hasAny(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS)) {
    return naturalPlan(PLAN_TEXT.requestedViewOpen, [naturalViewOpenAction(view, placement)]);
  }

  return emptyNaturalPlan();
}

function normalizeDeskActionRecord(
  value: unknown,
  index: number,
): { action?: XenesisDeskActionRequest; error?: string } {
  if (!isXenesisDeskActionRecordValue(value)) {
    return { error: DESK_ACTION_PROTOCOL_TEXT.mustBeJsonObject(index) };
  }

  const record = value;
  const pathValue = record[DESK_ACTION_PROTOCOL_RECORD_KEYS.path];
  const path = isXenesisDeskActionValueType(pathValue, DESK_ACTION_VALUE_TYPE_NAMES.string)
    ? pathValue.trim()
    : DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  if (!path) return { error: DESK_ACTION_PROTOCOL_TEXT.missingPath(index) };
  if (!path.startsWith(DESK_ACTION_PROTOCOL.pathPrefix)) {
    return { error: DESK_ACTION_PROTOCOL_TEXT.invalidPathPrefix(index, path, DESK_ACTION_PROTOCOL.pathPrefix) };
  }

  const idValue = record[DESK_ACTION_PROTOCOL_RECORD_KEYS.id];
  const id =
    isXenesisDeskActionValueType(idValue, DESK_ACTION_VALUE_TYPE_NAMES.string) && idValue.trim()
      ? idValue.trim()
      : DESK_ACTION_PROTOCOL_FORMAT.defaultActionId(index);
  const reasonValue = record[DESK_ACTION_PROTOCOL_RECORD_KEYS.reason];
  const reason =
    isXenesisDeskActionValueType(reasonValue, DESK_ACTION_VALUE_TYPE_NAMES.string) && reasonValue.trim()
      ? reasonValue.trim()
      : undefined;

  return {
    action: {
      id,
      path,
      args: Object.hasOwn(record, DESK_ACTION_PROTOCOL_RECORD_KEYS.args)
        ? record[DESK_ACTION_PROTOCOL_RECORD_KEYS.args]
        : {},
      approved: record[DESK_ACTION_PROTOCOL_RECORD_KEYS.approved] === true,
      ...(reason ? { reason } : {}),
    },
  };
}

function actionRecordsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isXenesisDeskActionRecordValue(value)) {
    const actions = value[DESK_ACTION_PROTOCOL_RECORD_KEYS.actions];
    if (Array.isArray(actions)) return actions;
  }
  return [value];
}

function normalizeVisibleText(value: string): string {
  return value
    .replace(DESK_ACTION_PROTOCOL_PATTERNS.visibleTextTrailingLineWhitespace, DESK_ACTION_PROTOCOL_FORMAT.lineBreak)
    .replace(DESK_ACTION_PROTOCOL_PATTERNS.visibleTextRepeatedBlankLines, DESK_ACTION_PROTOCOL_FORMAT.paragraphBreak)
    .trim();
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  const actions: XenesisDeskActionRequest[] = [];
  const errors: string[] = [];
  let actionIndex = 0;

  const sourceText = String(text || DESK_ACTION_PROTOCOL_FORMAT.emptyText);
  const visibleText = normalizeVisibleText(
    sourceText.replace(
      DESK_ACTION_PROTOCOL_PATTERNS.deskActionFence,
      (_block, blockJsonText: string, inlineJsonText?: string) => {
        const jsonText = blockJsonText || inlineJsonText || DESK_ACTION_PROTOCOL_FORMAT.emptyText;
        try {
          const parsed = JSON.parse(jsonText);
          for (const record of actionRecordsFromJson(parsed)) {
            const normalized = normalizeDeskActionRecord(record, actionIndex);
            if (normalized.action) actions.push(normalized.action);
            if (normalized.error) errors.push(normalized.error);
            actionIndex += 1;
          }
        } catch (error) {
          errors.push(
            DESK_ACTION_PROTOCOL_TEXT.jsonParseFailed(error instanceof Error ? error.message : String(error)),
          );
        }
        return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
      },
    ),
  );

  if (actions.length === 0 && errors.length === 0 && visibleText) {
    try {
      const parsed = JSON.parse(visibleText);
      const rawRecords = actionRecordsFromJson(parsed);
      const normalizedRecords = rawRecords.map((record, index) => normalizeDeskActionRecord(record, index));
      if (normalizedRecords.some((record) => record.action)) {
        return {
          visibleText: DESK_ACTION_PROTOCOL_FORMAT.emptyText,
          actions: normalizedRecords.flatMap((record) => (record.action ? [record.action] : [])),
          errors: normalizedRecords.flatMap((record) => (record.error ? [record.error] : [])),
        };
      }
    } catch {
      // Not a raw Desk action JSON payload. Keep it as ordinary chat text.
    }
  }

  return { visibleText, actions, errors };
}

export function shouldRunXenesisDeskActionsDirectly(parsed: XenesisDeskActionParseResult): boolean {
  return parsed.actions.length > 0;
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

function resultRecord(value: XenesisDeskActionExecutionResult): Record<string, unknown> {
  const result = value[DESK_ACTION_CALL_RESULT_KEYS.result];
  return isXenesisDeskActionRecordValue(result) ? result : {};
}

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionExecutionResult): boolean {
  const record = resultRecord(result);
  return (
    result[DESK_ACTION_CALL_RESULT_KEYS.approvalRequired] === true ||
    record[DESK_ACTION_CALL_RESULT_KEYS.approvalRequired] === true ||
    (!result.ok &&
      DESK_ACTION_PROTOCOL_PATTERNS.approvalRequiredError.test(
        result[DESK_ACTION_CALL_RESULT_KEYS.error] || DESK_ACTION_PROTOCOL_FORMAT.emptyText,
      ))
  );
}

export function pendingXenesisDeskActionsFromResults(
  actions: XenesisDeskActionRequest[],
  results: XenesisDeskActionExecutionResult[],
): XenesisDeskActionRequest[] {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  return results
    .filter(isXenesisDeskActionApprovalRequiredResult)
    .map((result) => actionById.get(result.id))
    .filter((action): action is XenesisDeskActionRequest => Boolean(action))
    .map((action) => ({ ...action, approved: DESK_ACTION_APPROVAL_STATE.pending }));
}

export function approveXenesisDeskActions(actions: XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return actions.map((action) => ({ ...action, approved: DESK_ACTION_APPROVAL_STATE.approved }));
}

function describeDeskAction(action: XenesisDeskActionRequest): string {
  return DESK_ACTION_PROTOCOL_FORMAT.actionBullet(action.path, action.reason);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isXenesisDeskActionRecordValue(value) ? value : {};
}

function compactJson(value: unknown, maxLength = DESK_ACTION_PROTOCOL_FORMAT.compactJsonMaxLength): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
    return json.length > maxLength ? DESK_ACTION_PROTOCOL_FORMAT.compactJsonOverflow(json, maxLength) : json;
  } catch {
    return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  }
}

function basename(value: unknown): string {
  const text = isXenesisDeskActionValueType(value, DESK_ACTION_VALUE_TYPE_NAMES.string)
    ? value.trim()
    : DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  if (!text) return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  const normalized = text.replace(
    DESK_ACTION_PROTOCOL_PATTERNS.windowsPathSeparator,
    DESK_ACTION_PROTOCOL_FORMAT.pathSeparator,
  );
  return normalized.split(DESK_ACTION_PROTOCOL_FORMAT.pathSeparator).filter(Boolean).pop() || text;
}

function arrayFromRecord(record: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function stringFromRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (isXenesisDeskActionValueType(value, DESK_ACTION_VALUE_TYPE_NAMES.string) && value.trim()) return value.trim();
  }
  return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
}

function numberFromRecord(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isXenesisDeskActionValueType(value, DESK_ACTION_VALUE_TYPE_NAMES.number)) return value;
  }
  return undefined;
}

function basenameFromRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = basename(record[key]);
    if (value) return value;
  }
  return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
}

function firstReadableTitle(value: unknown): string {
  if (isXenesisDeskActionValueType(value, DESK_ACTION_VALUE_TYPE_NAMES.string)) return basename(value) || value;
  const record = asRecord(value);
  return basenameFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.readableTitle);
}

function summarizeFileList(record: Record<string, unknown>): string {
  const files = arrayFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.fileList);
  if (files.length === 0) return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  const title = firstReadableTitle(files[0]);
  return DESK_ACTION_RESULT_SUMMARY_TEXT.fileList(files.length, title);
}

function summarizeCaptureResult(record: Record<string, unknown>): string {
  const nested = asRecord(record[DESK_ACTION_RESULT_SUMMARY_KEYS.captureRecord]);
  const file =
    basenameFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.captureFile) ||
    basenameFromRecord(nested, DESK_ACTION_RESULT_SUMMARY_KEYS.captureNestedFile);
  const width =
    numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth) ??
    numberFromRecord(nested, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth);
  const height =
    numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight) ??
    numberFromRecord(nested, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight);
  const size =
    width && height ? DESK_ACTION_RESULT_SUMMARY_TEXT.dimension(width, height) : DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  return DESK_ACTION_RESULT_SUMMARY_TEXT.joinParts([file, size]);
}

function summarizeBoundsResult(record: Record<string, unknown>): string {
  const bounds = asRecord(record[DESK_ACTION_RESULT_SUMMARY_KEYS.boundsRecord]);
  const width =
    numberFromRecord(bounds, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth) ??
    numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth);
  const height =
    numberFromRecord(bounds, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight) ??
    numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight);
  if (!width || !height) return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  return DESK_ACTION_RESULT_SUMMARY_TEXT.dimension(width, height);
}

function summarizeWorkflowResult(record: Record<string, unknown>): string {
  const name =
    stringFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.workflowName) ||
    DESK_ACTION_RESULT_SUMMARY_TEXT.workflowFallbackName;
  const completed = numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.workflowCompleted);
  const passed = numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.workflowPassed);
  const failed = numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.workflowFailed);
  const skipped = numberFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.workflowSkipped);
  const labels = DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetricLabels;
  const parts = [
    completed !== undefined
      ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(completed, labels.completed)
      : DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    passed !== undefined
      ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(passed, labels.passed)
      : DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    failed !== undefined
      ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(failed, labels.failed)
      : DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    skipped !== undefined
      ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(skipped, labels.skipped)
      : DESK_ACTION_PROTOCOL_FORMAT.emptyText,
  ].filter(Boolean);
  return DESK_ACTION_RESULT_SUMMARY_TEXT.workflowSummary(name, parts);
}

function summarizeDeskActionResult(result: XenesisDeskActionExecutionResult): string {
  const resultValue = result[DESK_ACTION_CALL_RESULT_KEYS.result];
  const record = asRecord(resultValue);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.filesListOpen) return summarizeFileList(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.captureActivePane) return summarizeCaptureResult(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.windowSizePreset) return summarizeBoundsResult(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.workflowRun) return summarizeWorkflowResult(record);

  const renderer = asRecord(record[DESK_ACTION_RESULT_SUMMARY_KEYS.rendererRecord]);
  const message =
    stringFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.message) ||
    stringFromRecord(renderer, DESK_ACTION_RESULT_SUMMARY_KEYS.message);
  if (message) return message;

  const compact = compactJson(resultValue);
  if (!compact || DESK_ACTION_RESULT_SUMMARY_TEXT.compactEmptyJson.includes(compact)) {
    return DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  }
  return compact;
}

export function buildXenesisDeskActionPendingMessage(
  actions: XenesisDeskActionRequest[],
  leadText: string = DESK_ACTION_PROTOCOL_FORMAT.emptyText,
): string {
  return DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    leadText.trim(),
    leadText.trim() ? DESK_ACTION_PROTOCOL_FORMAT.blankLine : undefined,
    DESK_ACTION_PROTOCOL_TEXT.approvalRequiredHeader,
    DESK_ACTION_PROTOCOL_TEXT.approvalRequiredBody,
    DESK_ACTION_PROTOCOL_FORMAT.blankLine,
    ...actions.map(describeDeskAction),
  ]);
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  const failed = results.filter((result) => !result.ok);
  const successful = results.filter((result) => result.ok);
  const header = DESK_ACTION_PROTOCOL_TEXT.completedHeader(failed.length);
  const appliedLines = successful.map((result) => {
    const summary = summarizeDeskActionResult(result);
    return DESK_ACTION_PROTOCOL_FORMAT.resultBullet(result.path, summary);
  });
  return DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    header,
    ...(successful.length > 0
      ? [DESK_ACTION_PROTOCOL_FORMAT.blankLine, DESK_ACTION_PROTOCOL_TEXT.appliedHeader, ...appliedLines]
      : []),
    ...(failed.length > 0
      ? [
          DESK_ACTION_PROTOCOL_FORMAT.blankLine,
          DESK_ACTION_PROTOCOL_TEXT.needsAttentionHeader,
          ...failed.map((result) =>
            DESK_ACTION_PROTOCOL_FORMAT.resultBullet(
              result.path,
              result[DESK_ACTION_CALL_RESULT_KEYS.error] || DESK_ACTION_PROTOCOL_TEXT.failureFallback,
            ),
          ),
        ]
      : []),
  ]);
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return DESK_ACTION_PROTOCOL_TEXT.executionSummary(result.ok, result.path);
}

function isCapabilityPathUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}${DESK_ACTION_PROTOCOL_FORMAT.capabilityPathSeparator}`);
}

function buildRegistryCapabilityPathSummary(prefixes: readonly string[]): string {
  return listDeskBridgeCapabilities()
    .filter((node) => node.callable)
    .map((node) => node.path)
    .filter((path) => prefixes.some((prefix) => isCapabilityPathUnderPrefix(path, prefix)))
    .sort()
    .join(DESK_ACTION_PROTOCOL_FORMAT.listSeparator);
}

function buildDirectCrPathSummary(lines: readonly string[]): string {
  const callablePaths = new Set(
    listDeskBridgeCapabilities()
      .filter((node) => node.callable)
      .map((node) => node.path),
  );
  const referencedPaths = new Set<string>();
  for (const line of lines) {
    for (const match of line.matchAll(DESK_ACTION_PROTOCOL_PATTERNS.crPath)) {
      const path = match[0].replace(
        DESK_ACTION_PROTOCOL_PATTERNS.trailingCrPathPunctuation,
        DESK_ACTION_PROTOCOL_FORMAT.emptyText,
      );
      if (callablePaths.has(path)) {
        referencedPaths.add(path);
      }
    }
  }
  return [...referencedPaths].join(DESK_ACTION_PROTOCOL_FORMAT.listSeparator);
}

export function buildXenesisDeskControlPromptHint(): string {
  const lines = [
    ...XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES,
    `${XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX}${buildRegistryCapabilityPathSummary(
      XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES,
    )}${DESK_ACTION_PROTOCOL_FORMAT.sentenceTerminator}`,
    ...XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES,
  ];
  return DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    ...lines,
    DESK_ACTION_PROTOCOL_TEXT.usefulDirectCrPaths(buildDirectCrPathSummary(lines)),
  ]);
}
