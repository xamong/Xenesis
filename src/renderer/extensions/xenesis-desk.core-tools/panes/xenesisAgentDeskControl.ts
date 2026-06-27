import { listDeskBridgeCapabilities } from '../../../../shared/deskBridgeCapabilities';
import {
  findXenesisNaturalGuideTarget,
  findXenesisNaturalWordsTarget,
  XENESIS_DESK_ACTION_PROTOCOL,
  XENESIS_DESK_ACTION_PROTOCOL_PATTERNS,
  XENESIS_DESK_ACTION_PROTOCOL_TEXT,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT,
  XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX,
  XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
  XENESIS_NATURAL_ACTION_INTENT_WORDS,
  XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_ALL_SCOPE_WORDS,
  XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS,
  XENESIS_NATURAL_APP_STATUS_TARGET_WORDS,
  XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS,
  XENESIS_NATURAL_ARRANGE_MODE_TARGETS,
  XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS,
  XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
  XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
  XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
  XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
  XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_TARGETS,
  XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_TOOL_OPEN_REASON,
  XENESIS_NATURAL_CORE_TOOL_TARGETS,
  XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS,
  XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS,
  XENESIS_NATURAL_DESK_ACTION_ARGS,
  XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
  XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_SIDE_TARGETS,
  XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS,
  XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS,
  XENESIS_NATURAL_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLICIT_OPEN_WORDS,
  XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTRACTION_PATTERNS,
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
  XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS,
  XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
  XENESIS_NATURAL_INTENT_PATTERNS,
  XENESIS_NATURAL_LIST_OR_SHOW_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
  XENESIS_NATURAL_ONBOARDING_STEP_TARGETS,
  XENESIS_NATURAL_OPEN_COMMAND_WORDS,
  XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS,
  XENESIS_NATURAL_OPEN_OR_SHOW_WORDS,
  XENESIS_NATURAL_OTHER_SCOPE_WORDS,
  XENESIS_NATURAL_PANE_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS,
  XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
  XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS,
  XENESIS_NATURAL_PLACEMENT_TARGETS,
  XENESIS_NATURAL_PLAN_VISIBLE_TEXT,
  XENESIS_NATURAL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_AUTO_TARGET,
  XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_TARGETS,
  XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
  XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
  XENESIS_NATURAL_RESIZE_COMMAND_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS,
  XENESIS_NATURAL_RIGHT_SCOPE_WORDS,
  XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
  XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
  XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS,
  XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
  XENESIS_NATURAL_TASK_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
  XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS,
  XENESIS_NATURAL_VIEW_OPEN_PATH,
  XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_TARGETS,
  XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS,
  XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
  XENESIS_NATURAL_XENESIS_CONTEXT_WORDS,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalCoreToolTarget,
  type XenesisNaturalDeskActionDescriptor,
  type XenesisNaturalDeskActionTemplateDescriptor,
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

export type XenesisDeskActionActivityPhase = 'start' | 'success' | 'failure' | 'approval-required';

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

type XenesisDeskPlacement = 'tab' | 'left' | 'right' | 'top' | 'bottom';
type XenesisDeskDockSide = 'left' | 'right' | 'top' | 'bottom';
type XenesisDeskWindowState = 'top' | 'left' | 'document' | 'right' | 'bottom';
type XenesisDeskArrangeMode = 'row' | 'column' | 'grid';

function normalizeNaturalLanguageText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(EXTRACTION_PATTERNS.normalizedWhitespace, ' ')
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
  return { id, path, args, approved: false, reason };
}

function naturalCatalogAction(descriptor: XenesisNaturalDeskActionDescriptor, args: unknown): XenesisDeskActionRequest {
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
    approved: false,
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
    approved: false,
    reason: view.reason,
  };
}

const DESK_ACTIONS = XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS;
const DESK_ACTION_PROTOCOL = XENESIS_DESK_ACTION_PROTOCOL;
const DESK_ACTION_PROTOCOL_PATTERNS = XENESIS_DESK_ACTION_PROTOCOL_PATTERNS;
const DESK_ACTION_PROTOCOL_TEXT = XENESIS_DESK_ACTION_PROTOCOL_TEXT;
const DESK_ACTION_RESULT_SUMMARY_KEYS = XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS;
const DESK_ACTION_RESULT_SUMMARY_PATHS = XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS;
const DESK_ACTION_RESULT_SUMMARY_TEXT = XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT;
const DESK_ACTION_ARG_DEFAULTS = XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS;
const DESK_ACTION_ARGS = XENESIS_NATURAL_DESK_ACTION_ARGS;
const DEFAULT_DESK_PLACEMENT = DESK_ACTION_ARG_DEFAULTS.placement;
const EXTRACTION_PATTERNS = XENESIS_NATURAL_EXTRACTION_PATTERNS;
const CONNECTION_AGGREGATE_OPEN_ACTIONS = XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS;
const CONNECTION_AGGREGATE_STATUS_ACTIONS = XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS;
const CONNECTION_TARGET_OPEN_ACTIONS = XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS;
const CONNECTION_TARGET_STATUS_ACTIONS = XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS;
const CORE_TOOL_OPEN_REASON = XENESIS_NATURAL_CORE_TOOL_OPEN_REASON;
const GUIDE_ACTIONS = XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS;
const INTENT_PATTERNS = XENESIS_NATURAL_INTENT_PATTERNS;
const MESSENGER_AGGREGATE_OPEN_ACTIONS = XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS;
const MESSENGER_AGGREGATE_STATUS_ACTIONS = XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS;
const ONBOARDING_ACTIONS = XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS;
const PLAN_TEXT = XENESIS_NATURAL_PLAN_VISIBLE_TEXT;
const PROVIDER_AGGREGATE_OPEN_ACTIONS = XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS;
const PROVIDER_AGGREGATE_STATUS_ACTIONS = XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS;
const PROVIDER_AUTO_TARGET = XENESIS_NATURAL_PROVIDER_AUTO_TARGET;
const PROVIDER_OPEN_ACTIONS = XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS;
const PROVIDER_STATUS_ACTIONS = XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS;
const REVIEW_REQUEST_ACTIONS = XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS;
const RUNTIME_ACTIONS = XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS;
const TOOL_AGGREGATE_OPEN_ACTIONS = XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS;
const TOOL_AGGREGATE_STATUS_ACTIONS = XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS;

function naturalPlan(
  visibleText: string,
  actions: XenesisDeskActionRequest[],
  errors: string[] = [],
): XenesisDeskNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

function emptyNaturalPlan(): XenesisDeskNaturalLanguagePlan {
  return { visibleText: '', actions: [], errors: [], matched: false };
}

function detectPlacement(value: string): XenesisDeskPlacement | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PLACEMENT_TARGETS)?.id as
    | XenesisDeskPlacement
    | undefined;
}

function detectWindowSizerPreset(value: string): string | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS)?.id;
}

function extractFirstInteger(value: string, min = 1, max = 100): number | undefined {
  const match = String(value || '').match(EXTRACTION_PATTERNS.firstInteger);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0] || '', 10);
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
  return String(value || '').replace(EXTRACTION_PATTERNS.quotedText, ' ');
}

function extractQuotedTexts(value: string): string[] {
  const texts: string[] = [];
  for (const match of String(value || '').matchAll(EXTRACTION_PATTERNS.quotedText)) {
    const quoted = match[1]?.trim();
    if (quoted) texts.push(quoted);
  }
  return texts;
}

function extractQuotedText(value: string): string {
  return extractQuotedTexts(value)[0] || '';
}

function extractLocalPath(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const windowsPath = value.match(EXTRACTION_PATTERNS.localWindowsPath);
  if (windowsPath?.[0]) return windowsPath[0].trim().replace(EXTRACTION_PATTERNS.trailingPathPunctuation, '');
  const unixPath = value.match(EXTRACTION_PATTERNS.localUnixPath);
  return unixPath?.[0]?.trim().replace(EXTRACTION_PATTERNS.trailingPathPunctuation, '') || '';
}

function extractFilterQuery(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const cleaned = value
    .replace(EXTRACTION_PATTERNS.filterQueryWords, ' ')
    .replace(EXTRACTION_PATTERNS.normalizedWhitespace, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function extractTerminalCommand(rawText: string): string {
  const quoted = extractQuotedText(rawText);
  if (quoted) return quoted;
  return String(rawText || '')
    .replace(EXTRACTION_PATTERNS.terminalCommandPrefix, '')
    .replace(EXTRACTION_PATTERNS.terminalCommandSuffix, '')
    .replace(EXTRACTION_PATTERNS.terminalCommandTrim, '')
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

function xenesisGuideFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasAny(value, XENESIS_NATURAL_GUIDE_CONTEXT_WORDS)) return null;

  return findXenesisNaturalGuideTarget(value);
}

function xenesisGuideActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guide = xenesisGuideFromNaturalText(value);
  if (!guide) return null;

  const openFile = hasAny(value, XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS);

  return naturalTemplateAction(GUIDE_ACTIONS.open, [guide.id, guide.label, openFile], {
    id: guide.id,
    ensureVisible: true,
    ...(openFile ? { openFile: true } : {}),
  });
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guide = xenesisGuideFromNaturalText(value);
  if (!guide) return null;

  return naturalTemplateAction(GUIDE_ACTIONS.status, [guide.id, guide.label], { id: guide.id });
}

function hasXenesisOnboardingContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS);
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasXenesisOnboardingContext(value)) return null;

  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS);
}

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) {
    if (!hasXenesisOnboardingContext(value)) return null;

    return naturalCatalogAction(ONBOARDING_ACTIONS.centerOpen, { ensureVisible: true });
  }

  return naturalTemplateAction(ONBOARDING_ACTIONS.stepOpen, [step.id, step.label], {
    id: step.id,
    ensureVisible: true,
  });
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  return naturalTemplateAction(ONBOARDING_ACTIONS.stepStatus, [step.id, step.label], { id: step.id });
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

  if (hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.connectors, {});
  }

  if (hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_DRAFT_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.mcpInstallDrafts, {});
  }

  if (hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.oauthDrafts, {});
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.views, {});
  }

  if (hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.installPlans, {});
  }

  if (hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.setup, {});
  }

  if (hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.actions, {});
  }

  if (hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_STATUS_ACTIONS.userStories, {});
  }

  return null;
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.profileDrafts, {});
  }

  if (hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.routing, {});
  }

  if (hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.safety, {});
  }

  if (hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.accessGroups, {});
  }

  if (hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.pairing, {});
  }

  if (hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.userStories, {});
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.views, {});
  }

  return null;
}

function hasXenesisConnectionContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS);
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

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_STATUS_ACTIONS.routing, {});
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_STATUS_ACTIONS.views, {});
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_STATUS_ACTIONS.profileDrafts, {});
  }

  return naturalCatalogAction(PROVIDER_AGGREGATE_STATUS_ACTIONS.setup, {});
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const providerAggregateAction = xenesisProviderAggregateStatusActionFromNaturalText(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_STATUS_ACTIONS.routing, [provider.id, provider.label], {
      provider: provider.id,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_STATUS_ACTIONS.views, [provider.id, provider.label], {
      provider: provider.id,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_STATUS_ACTIONS.profileDrafts, [provider.id, provider.label], {
      provider: provider.id,
    });
  }

  return naturalTemplateAction(PROVIDER_STATUS_ACTIONS.setup, [provider.id, provider.label], {
    provider: provider.id,
  });
}

function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_STATUS_ACTIONS.profileDrafts, {});
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (target) {
    if (hasAny(value, XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.diagnostics, [target.id, target.label], {
        id: target.id,
      });
    }

    if (hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.setupRequest, [target.id, target.label], {
        id: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolMcpInstallDraft, [target.id, target.label], {
        tool: target.id,
      });
    }

    if (
      target.kind === 'tool' &&
      (target.id === 'google-calendar' || target.id === 'google-workspace') &&
      hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)
    ) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolOauthDraft, [target.id, target.label], {
        id: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolUserStory, [target.id, target.label], {
        tool: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolActionPolicy, [target.id, target.label], {
        tool: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolInstallPlan, [target.id, target.label], {
        tool: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolSetup, [target.id, target.label], {
        id: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolConnector, [target.id, target.label], {
        tool: target.id,
      });
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.toolView, [target.id, target.label], {
        id: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelRouting, [target.id, target.label], {
        channel: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelSafety, [target.id, target.label], {
        channel: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelAccessGroups, [target.id, target.label], {
        channel: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelPairing, [target.id, target.label], {
        channel: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelUserStory, [target.id, target.label], {
        id: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.channelProfileDraft, [target.id, target.label], {
        channel: target.id,
      });
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS)) {
      return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.messengerView, [target.id, target.label], {
        id: target.id,
      });
    }

    return naturalTemplateAction(CONNECTION_TARGET_STATUS_ACTIONS.diagnostics, [target.id, target.label], {
      id: target.id,
    });
  }

  if (hasXenesisGuideCatalogContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.guides, {});
  }

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.diagnostics, {});
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.setupRequests, {});
  }

  const guideStatusAction = xenesisGuideStatusActionFromNaturalText(value);
  if (guideStatusAction) return guideStatusAction;

  const toolAggregateStatusAction = xenesisToolAggregateStatusActionFromNaturalText(value);
  if (toolAggregateStatusAction) return toolAggregateStatusAction;

  const messengerAggregateStatusAction = xenesisMessengerAggregateStatusActionFromNaturalText(value);
  if (messengerAggregateStatusAction) return messengerAggregateStatusAction;

  if (hasXenesisOnboardingContext(value)) {
    const onboardingStatusAction = xenesisOnboardingStatusActionFromNaturalText(value);
    if (onboardingStatusAction) return onboardingStatusAction;

    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.onboarding, {});
  }

  if (hasAny(value, XENESIS_NATURAL_GUIDE_CONTEXT_WORDS)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.guides, {});
  }

  if (hasXenesisConnectionContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_STATUS_ACTIONS.connections, {});
  }

  return null;
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
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.providerProfileDraft, [provider.id, provider.label], {
      provider: provider.id,
    });
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.toolInstallPlan, [target.id, target.label], { id: target.id });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS)) {
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.toolMcpInstallDraft, [target.id, target.label], {
      id: target.id,
    });
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)
  ) {
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.toolOauthDraft, [target.id, target.label], { id: target.id });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.toolActionPolicy, [target.id, target.label], { id: target.id });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS)) {
    return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.channelProfileDraft, [target.id, target.label], {
      channel: target.id,
    });
  }

  return naturalTemplateAction(REVIEW_REQUEST_ACTIONS.connectionSetupRequest, [target.id, target.label], {
    id: target.id,
  });
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_OPEN_ACTIONS.routing, [provider.id, provider.label], {
      provider: provider.id,
      ensureVisible: true,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_OPEN_ACTIONS.profileDrafts, [provider.id, provider.label], {
      provider: provider.id,
      ensureVisible: true,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_OPEN_ACTIONS.views, [provider.id, provider.label], {
      provider: provider.id,
      ensureVisible: true,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalTemplateAction(PROVIDER_OPEN_ACTIONS.setup, [provider.id, provider.label], {
      provider: provider.id,
      ensureVisible: true,
    });
  }

  return null;
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisGuideCatalogContext(value)) return null;

  return naturalCatalogAction(CONNECTION_AGGREGATE_OPEN_ACTIONS.guides, { ensureVisible: true });
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_OPEN_ACTIONS.routing, { ensureVisible: true });
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_OPEN_ACTIONS.setup, { ensureVisible: true });
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_OPEN_ACTIONS.views, { ensureVisible: true });
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_OPEN_ACTIONS.profileDrafts, { ensureVisible: true });
  }

  if (hasXenesisProviderProfileContext(value)) {
    return naturalCatalogAction(PROVIDER_AGGREGATE_OPEN_ACTIONS.catalog, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.connectors, { ensureVisible: true });
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_DRAFT_CONTEXT_WORDS)
  ) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.mcpInstallDrafts, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.oauthDrafts, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.views, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.installPlans, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.setup, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.actions, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.userStories, { ensureVisible: true });
  }

  if (hasExternalToolCatalogContext(value)) {
    return naturalCatalogAction(TOOL_AGGREGATE_OPEN_ACTIONS.catalog, { ensureVisible: true });
  }

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.profileDrafts, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.routing, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.safety, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.accessGroups, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.pairing, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.userStories, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.views, { ensureVisible: true });
  }

  if (hasExternalMessengerCatalogContext(value)) {
    return naturalCatalogAction(MESSENGER_AGGREGATE_OPEN_ACTIONS.catalog, { ensureVisible: true });
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

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_OPEN_ACTIONS.diagnostics, { ensureVisible: true });
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_OPEN_ACTIONS.setupRequests, { ensureVisible: true });
  }

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS)) {
    return naturalCatalogAction(CONNECTION_AGGREGATE_OPEN_ACTIONS.connections, { ensureVisible: true });
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.diagnostics, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.setupRequest, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS)
  ) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolOauthDraft, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolMcpInstallDraft, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolUserStory, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolActionPolicy, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolInstallPlan, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolConnector, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolSetup, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.toolView, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelUserStory, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelProfileDraft, [target.id, target.label], {
      channel: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelRouting, [target.id, target.label], {
      channel: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelSafety, [target.id, target.label], {
      channel: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelAccessGroups, [target.id, target.label], {
      channel: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.channelPairing, [target.id, target.label], {
      channel: target.id,
      ensureVisible: true,
    });
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS)) {
    return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.messengerView, [target.id, target.label], {
      id: target.id,
      ensureVisible: true,
    });
  }

  return naturalTemplateAction(CONNECTION_TARGET_OPEN_ACTIONS.connectionCard, [target.id, target.label], {
    id: target.id,
    ensureVisible: true,
  });
}

function localCliMcpReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const wantsReadback = hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS);

  if (
    hasAny(value, XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS)
  ) {
    return naturalCatalogAction(RUNTIME_ACTIONS.localCliScan, {});
  }

  if (wantsReadback && hasAny(value, XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.mcpBridgeStatus, {});
  }

  if (wantsReadback && hasAny(value, XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.mcpSettingsStatus, {});
  }

  return null;
}

function xenesisGatewayActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.gatewayDashboardOpen, {});
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.gatewayStatus, {});
  }

  return null;
}

function xenesisAgentReadbackActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_AGENT_CONTEXT_WORDS)) return null;

  const agentId = extractQuotedText(rawText);
  if (!agentId) return null;

  if (hasAny(value, XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.agentEvents, { agentId });
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.agentStatus, { agentId });
  }

  return null;
}

function xenesisRuntimeInventoryActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;

  const xenesisAgentReadbackAction = xenesisAgentReadbackActionFromNaturalText(value, rawText);
  if (xenesisAgentReadbackAction) return xenesisAgentReadbackAction;

  const hasSpecificStatusTarget = hasAny(value, XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS);
  const isBroadXenesisStatus =
    hasAny(value, XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS) ||
    (hasAny(value, XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS));
  if (isBroadXenesisStatus && !hasSpecificStatusTarget) {
    return naturalCatalogAction(RUNTIME_ACTIONS.runtimeStatus, {});
  }

  if (hasAny(value, XENESIS_NATURAL_REPORT_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.reportsList, {});
  }

  if (hasAny(value, XENESIS_NATURAL_TASK_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.tasksList, {});
  }

  if (hasAny(value, XENESIS_NATURAL_AGENT_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.agentsList, {});
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.diagnostics, {});
  }

  return null;
}

function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_PROFILE_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.profilesList, {});
  }

  return null;
}

function xenesisAgentSubmitActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  if (!hasAny(intentValue, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_AGENT_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS)) {
    return null;
  }

  const [agentId, text] = extractQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return naturalCatalogAction(RUNTIME_ACTIONS.agentSubmit, { agentId, text });
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  if (!hasAny(intentValue, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_RUN_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_RUN_START_CONTEXT_WORDS)) return null;
  if (hasAny(intentValue, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS)) return null;

  const prompt = extractQuotedText(rawText);
  if (!prompt) return null;

  return naturalCatalogAction(RUNTIME_ACTIONS.runsStart, { prompt });
}

function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS)) {
    return naturalCatalogAction(RUNTIME_ACTIONS.runsCancel, {});
  }

  if (
    hasAny(value, XENESIS_NATURAL_SESSION_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS)
  ) {
    return naturalCatalogAction(RUNTIME_ACTIONS.sessionsReset, {});
  }

  return null;
}

function xenesisWorkspaceSetActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS)) return null;

  const path = extractLocalPath(rawText);
  if (!path) return null;

  return naturalCatalogAction(RUNTIME_ACTIONS.workspaceSet, { path });
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || '').trim();
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

  if (hasAny(value, XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalPlan(PLAN_TEXT.settingsPaneOpen, [
      naturalCatalogAction(DESK_ACTIONS.settingsOpen, DESK_ACTION_ARGS.placement(placement)),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS)
  ) {
    return naturalPlan(PLAN_TEXT.diagnosticsPaneOpen, [
      naturalCatalogAction(DESK_ACTIONS.diagnosticsOpen, DESK_ACTION_ARGS.placement(placement)),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.capabilityExplorerOpen, [
      naturalCatalogAction(DESK_ACTIONS.capabilityExplorerOpen, DESK_ACTION_ARGS.placement(placement)),
    ]);
  }

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalPlan(PLAN_TEXT.requestedToolPanelOpen, [toolOpenAction]);
  }

  if (hasAny(value, XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.captureListRead, [naturalCatalogAction(DESK_ACTIONS.captureList, {})]);
    }
    return naturalPlan(PLAN_TEXT.activePaneCapture, [naturalCatalogAction(DESK_ACTIONS.captureActivePane, {})]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS)
  ) {
    return naturalPlan(PLAN_TEXT.activeDockFocus, [
      naturalCatalogAction(DESK_ACTIONS.dockFocusActive, DESK_ACTION_ARGS.useActive()),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS)
  ) {
    let action: XenesisNaturalDeskActionDescriptor = DESK_ACTIONS.dockCloseActive;
    if (hasAny(value, XENESIS_NATURAL_RIGHT_SCOPE_WORDS)) {
      action = DESK_ACTIONS.dockCloseRight;
    } else if (hasAny(value, XENESIS_NATURAL_OTHER_SCOPE_WORDS)) {
      action = DESK_ACTIONS.dockCloseOthers;
    } else if (hasAny(value, XENESIS_NATURAL_ALL_SCOPE_WORDS)) {
      action = DESK_ACTIONS.dockCloseAll;
    }
    return naturalPlan(PLAN_TEXT.activeDockClose, [naturalCatalogAction(action, DESK_ACTION_ARGS.useActive())]);
  }

  const dockSide = detectDockSide(value);
  const dockSize = extractFirstInteger(value, 120, 4096);
  if (
    dockSide &&
    dockSize &&
    hasAny(value, XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_RESIZE_COMMAND_WORDS)
  ) {
    return naturalPlan(PLAN_TEXT.dockAreaResize, [
      naturalCatalogAction(DESK_ACTIONS.dockSizeSet, DESK_ACTION_ARGS.dockSize(dockSide, dockSize)),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS) || detectWindowSizerPreset(value)) {
    const presetId = detectWindowSizerPreset(value);
    if (presetId) {
      return naturalPlan(PLAN_TEXT.windowSizePreset(presetId), [
        naturalCatalogAction(DESK_ACTIONS.windowSizePreset, DESK_ACTION_ARGS.presetId(presetId)),
      ]);
    }
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.filesListRead, [naturalCatalogAction(DESK_ACTIONS.filesListOpen, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_GENERIC_OPEN_WORDS)) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan(PLAN_TEXT.fileOpen, [
      naturalCatalogAction(DESK_ACTIONS.fileOpen, DESK_ACTION_ARGS.optionalFilePath(filePath)),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS)) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan(PLAN_TEXT.fileContentRead, [
      naturalCatalogAction(DESK_ACTIONS.fileRead, DESK_ACTION_ARGS.optionalFilePath(filePath)),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.explorerHide, [naturalCatalogAction(DESK_ACTIONS.explorerHide, {})]);
    }
    if (hasAny(value, XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.explorerToggle, [naturalCatalogAction(DESK_ACTIONS.explorerToggle, {})]);
    }
    if (hasAny(value, XENESIS_NATURAL_REFRESH_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.explorerRefresh, [naturalCatalogAction(DESK_ACTIONS.explorerRefresh, {})]);
    }
    if (hasAny(value, XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.explorerGoUp, [naturalCatalogAction(DESK_ACTIONS.explorerGoUp, {})]);
    }
    if (hasAny(value, XENESIS_NATURAL_FILTER_CONTEXT_WORDS)) {
      const query = extractFilterQuery(rawText);
      return naturalPlan(PLAN_TEXT.explorerFilterApply, [
        naturalCatalogAction(DESK_ACTIONS.explorerFilter, DESK_ACTION_ARGS.filterQuery(query)),
      ]);
    }
    const path = extractLocalPath(rawText);
    if (path) {
      return naturalPlan(PLAN_TEXT.explorerNavigate, [
        naturalCatalogAction(DESK_ACTIONS.explorerNavigate, DESK_ACTION_ARGS.explorerPath(path)),
      ]);
    }
    return naturalPlan(PLAN_TEXT.explorerShow, [naturalCatalogAction(DESK_ACTIONS.explorerShow, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.favoritesShow, [naturalCatalogAction(DESK_ACTIONS.favoritesShow, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.terminalListRead, [naturalCatalogAction(DESK_ACTIONS.terminalsList, {})]);
    }

    const count = extractFirstInteger(value, 1, 50);
    if (count && count > 1 && hasAny(value, XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS)) {
      const actions = [
        naturalCatalogAction(DESK_ACTIONS.terminalRunMany, DESK_ACTION_ARGS.terminalMany(count, placement)),
      ];
      const arrangeMode = detectArrangeMode(value);
      if (arrangeMode && hasAny(value, XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS)) {
        actions.push(
          naturalCatalogAction(
            DESK_ACTIONS.dockWindowArrange,
            DESK_ACTION_ARGS.dockWindowArrange(detectDockWindowState(value), arrangeMode),
          ),
        );
      }
      return naturalPlan(PLAN_TEXT.multipleTerminalsOpenAndArrange, actions);
    }

    if (hasAny(value, XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS)) {
      const command = extractTerminalCommand(rawText);
      return naturalPlan(PLAN_TEXT.terminalCommandRun, [
        naturalCatalogAction(DESK_ACTIONS.terminalRun, DESK_ACTION_ARGS.terminalRun(command, placement)),
      ]);
    }
  }

  const scopedArrangeMode = detectArrangeMode(value);
  if (scopedArrangeMode && hasAny(value, XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS)) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan(PLAN_TEXT.scopedDeskAreaArrange, [
        naturalCatalogAction(
          DESK_ACTIONS.dockWindowArrange,
          DESK_ACTION_ARGS.dockWindowArrange(windowState, scopedArrangeMode),
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_PANE_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.activeDockPaneArrange, [
        naturalCatalogAction(DESK_ACTIONS.dockPaneArrange, DESK_ACTION_ARGS.dockPaneArrange(scopedArrangeMode)),
      ]);
    }
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.dockGroupTile, [naturalCatalogAction(DESK_ACTIONS.dockArrangeGrid, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.dockGroupHorizontal, [naturalCatalogAction(DESK_ACTIONS.dockArrangeHorizontal, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.dockGroupVertical, [naturalCatalogAction(DESK_ACTIONS.dockArrangeVertical, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS)) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan(PLAN_TEXT.scopedDockMerge, [
        naturalCatalogAction(DESK_ACTIONS.dockWindowMerge, { windowState }),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_PANE_CONTEXT_WORDS)) {
      return naturalPlan(PLAN_TEXT.activeDockPaneMerge, [
        naturalCatalogAction(DESK_ACTIONS.dockPaneMerge, DESK_ACTION_ARGS.useActive()),
      ]);
    }
    const action = hasAny(value, XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS)
      ? DESK_ACTIONS.dockMergeAll
      : DESK_ACTIONS.dockMergeGroup;
    return naturalPlan(PLAN_TEXT.dockMerge, [naturalCatalogAction(action, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.dockPanesListRead, [naturalCatalogAction(DESK_ACTIONS.dockPanesList, {})]);
  }

  if (hasAny(value, XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS)) {
    return naturalPlan(PLAN_TEXT.artifactTargetSet, [
      naturalCatalogAction(DESK_ACTIONS.artifactTargetSet, DESK_ACTION_ARGS.useActive()),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_APP_STATUS_TARGET_WORDS)
  ) {
    return naturalPlan(PLAN_TEXT.appStatusRead, [naturalCatalogAction(DESK_ACTIONS.appStatus, {})]);
  }

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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: DESK_ACTION_PROTOCOL_TEXT.mustBeJsonObject(index) };
  }

  const record = value as Record<string, unknown>;
  const path = typeof record.path === 'string' ? record.path.trim() : '';
  if (!path) return { error: DESK_ACTION_PROTOCOL_TEXT.missingPath(index) };
  if (!path.startsWith(DESK_ACTION_PROTOCOL.pathPrefix)) {
    return { error: DESK_ACTION_PROTOCOL_TEXT.invalidPathPrefix(index, path, DESK_ACTION_PROTOCOL.pathPrefix) };
  }

  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `desk-action-${index + 1}`;
  const reason = typeof record.reason === 'string' && record.reason.trim() ? record.reason.trim() : undefined;

  return {
    action: {
      id,
      path,
      args: Object.hasOwn(record, 'args') ? record.args : {},
      approved: record.approved === true,
      ...(reason ? { reason } : {}),
    },
  };
}

function actionRecordsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).actions)) {
    return (value as Record<string, unknown>).actions as unknown[];
  }
  return [value];
}

function normalizeVisibleText(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  const actions: XenesisDeskActionRequest[] = [];
  const errors: string[] = [];
  let actionIndex = 0;

  const sourceText = String(text || '');
  const visibleText = normalizeVisibleText(
    sourceText.replace(
      DESK_ACTION_PROTOCOL_PATTERNS.deskActionFence,
      (_block, blockJsonText: string, inlineJsonText?: string) => {
        const jsonText = blockJsonText || inlineJsonText || '';
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
        return '';
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
          visibleText: '',
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
    reportActivity({ phase: 'start', action });
    try {
      const callResult = await executor(action.path, action.args, { approved: action.approved });
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: callResult.ok !== false,
        result: callResult.result ?? callResult,
        ...(callResult.error ? { error: callResult.error } : {}),
        ...(callResult.approvalRequired ? { approvalRequired: callResult.approvalRequired } : {}),
        ...(callResult.permission ? { permission: callResult.permission } : {}),
        ...(callResult.approval ? { approval: callResult.approval } : {}),
        ...(callResult.source ? { source: callResult.source } : {}),
      };
      results.push(result);
      reportActivity({
        phase: isXenesisDeskActionApprovalRequiredResult(result)
          ? 'approval-required'
          : result.ok
            ? 'success'
            : 'failure',
        action,
        result,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (error) {
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      reportActivity({ phase: 'failure', action, result, error: result.error });
    }
  }
  return results;
}

function resultRecord(value: XenesisDeskActionExecutionResult): Record<string, unknown> {
  return value.result && typeof value.result === 'object' && !Array.isArray(value.result)
    ? (value.result as Record<string, unknown>)
    : {};
}

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionExecutionResult): boolean {
  const record = resultRecord(result);
  return (
    result.approvalRequired === true ||
    record.approvalRequired === true ||
    (!result.ok && DESK_ACTION_PROTOCOL_PATTERNS.approvalRequiredError.test(result.error || ''))
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
    .map((action) => ({ ...action, approved: false }));
}

export function approveXenesisDeskActions(actions: XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return actions.map((action) => ({ ...action, approved: true }));
}

function describeDeskAction(action: XenesisDeskActionRequest): string {
  const reason = action.reason ? ` - ${action.reason}` : '';
  return `- ${action.path}${reason}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function compactJson(value: unknown, maxLength = 180): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return '';
    return json.length > maxLength ? `${json.slice(0, maxLength - 1)}...` : json;
  } catch {
    return '';
  }
}

function basename(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  const normalized = text.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || text;
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
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function numberFromRecord(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function basenameFromRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = basename(record[key]);
    if (value) return value;
  }
  return '';
}

function firstReadableTitle(value: unknown): string {
  if (typeof value === 'string') return basename(value) || value;
  const record = asRecord(value);
  return basenameFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.readableTitle);
}

function summarizeFileList(record: Record<string, unknown>): string {
  const files = arrayFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.fileList);
  if (files.length === 0) return '';
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
  const size = width && height ? DESK_ACTION_RESULT_SUMMARY_TEXT.dimension(width, height) : '';
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
  if (!width || !height) return '';
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
    completed !== undefined ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(completed, labels.completed) : '',
    passed !== undefined ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(passed, labels.passed) : '',
    failed !== undefined ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(failed, labels.failed) : '',
    skipped !== undefined ? DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(skipped, labels.skipped) : '',
  ].filter(Boolean);
  return DESK_ACTION_RESULT_SUMMARY_TEXT.workflowSummary(name, parts);
}

function summarizeDeskActionResult(result: XenesisDeskActionExecutionResult): string {
  const record = asRecord(result.result);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.filesListOpen) return summarizeFileList(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.captureActivePane) return summarizeCaptureResult(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.windowSizePreset) return summarizeBoundsResult(record);
  if (result.path === DESK_ACTION_RESULT_SUMMARY_PATHS.workflowRun) return summarizeWorkflowResult(record);

  const renderer = asRecord(record[DESK_ACTION_RESULT_SUMMARY_KEYS.rendererRecord]);
  const message =
    stringFromRecord(record, DESK_ACTION_RESULT_SUMMARY_KEYS.message) ||
    stringFromRecord(renderer, DESK_ACTION_RESULT_SUMMARY_KEYS.message);
  if (message) return message;

  const compact = compactJson(result.result);
  if (!compact || DESK_ACTION_RESULT_SUMMARY_TEXT.compactEmptyJson.includes(compact)) return '';
  return compact;
}

export function buildXenesisDeskActionPendingMessage(actions: XenesisDeskActionRequest[], leadText = ''): string {
  return [
    leadText.trim(),
    leadText.trim() ? '' : undefined,
    DESK_ACTION_PROTOCOL_TEXT.approvalRequiredHeader,
    DESK_ACTION_PROTOCOL_TEXT.approvalRequiredBody,
    '',
    ...actions.map(describeDeskAction),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  const failed = results.filter((result) => !result.ok);
  const successful = results.filter((result) => result.ok);
  const header = DESK_ACTION_PROTOCOL_TEXT.completedHeader(failed.length);
  const appliedLines = successful.map((result) => {
    const summary = summarizeDeskActionResult(result);
    return summary ? `- ${result.path}: ${summary}` : `- ${result.path}`;
  });
  return [
    header,
    ...(successful.length > 0 ? ['', DESK_ACTION_PROTOCOL_TEXT.appliedHeader, ...appliedLines] : []),
    ...(failed.length > 0
      ? [
          '',
          DESK_ACTION_PROTOCOL_TEXT.needsAttentionHeader,
          ...failed.map((result) => `- ${result.path}: ${result.error || DESK_ACTION_PROTOCOL_TEXT.failureFallback}`),
        ]
      : []),
  ].join('\n');
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return DESK_ACTION_PROTOCOL_TEXT.executionSummary(result.ok, result.path);
}

function isCapabilityPathUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

function buildRegistryCapabilityPathSummary(prefixes: readonly string[]): string {
  return listDeskBridgeCapabilities()
    .filter((node) => node.callable)
    .map((node) => node.path)
    .filter((path) => prefixes.some((prefix) => isCapabilityPathUnderPrefix(path, prefix)))
    .sort()
    .join(', ');
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
      const path = match[0].replace(DESK_ACTION_PROTOCOL_PATTERNS.trailingCrPathPunctuation, '');
      if (callablePaths.has(path)) {
        referencedPaths.add(path);
      }
    }
  }
  return [...referencedPaths].join(', ');
}

export function buildXenesisDeskControlPromptHint(): string {
  const lines = [
    ...XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES,
    `${XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX}${buildRegistryCapabilityPathSummary(
      XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES,
    )}.`,
    ...XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES,
  ];
  return [...lines, DESK_ACTION_PROTOCOL_TEXT.usefulDirectCrPaths(buildDirectCrPathSummary(lines))].join('\n');
}
