import { listDeskBridgeCapabilities } from '../../../../shared/deskBridgeCapabilities';
import {
  findXenesisNaturalGuideTarget,
  findXenesisNaturalWordsTarget,
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
  XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
  XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_TARGETS,
  XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
  XENESIS_NATURAL_CORE_TOOL_TARGETS,
  XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS,
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
  XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS,
  XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
  XENESIS_NATURAL_LIST_OR_SHOW_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
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
  XENESIS_NATURAL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_TARGETS,
  XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
  XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
  XENESIS_NATURAL_RESIZE_COMMAND_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS,
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
  XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
  XENESIS_NATURAL_TASK_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
  XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS,
  XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_TARGETS,
  XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS,
  XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
  XENESIS_NATURAL_XENESIS_CONTEXT_WORDS,
  type XenesisNaturalConnectionTarget,
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

const DESK_ACTION_FENCE_PATTERN =
  /```xenesis-desk-actions?(?:[ \t]*\r?\n([\s\S]*?)^```[ \t]*$|[ \t]+([{[][^\r\n]*))/gim;

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
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasAny(value: string, words: readonly string[]): boolean {
  return words.some((word) => value.includes(word));
}

function hasExplicitOpenIntent(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_EXPLICIT_OPEN_WORDS) || /\b(open|focus)\b/.test(value);
}

function hasActionIntent(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_ACTION_INTENT_WORDS);
}

function naturalAction(id: string, path: string, args: unknown, reason: string): XenesisDeskActionRequest {
  return { id, path, args, approved: false, reason };
}

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

function withPlacement(
  args: Record<string, unknown>,
  placement: XenesisDeskPlacement | undefined,
  fallback: XenesisDeskPlacement,
): Record<string, unknown> {
  return { ...args, placement: placement || fallback };
}

function detectWindowSizerPreset(value: string): string | undefined {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS)?.id;
}

function extractFirstInteger(value: string, min = 1, max = 100): number | undefined {
  const match = String(value || '').match(/\d+/);
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
  return String(value || '').replace(/["'“”‘’`](.+?)["'“”‘’`]/g, ' ');
}

function extractQuotedTexts(value: string): string[] {
  const texts: string[] = [];
  const quotedPattern = /["'“”‘’`](.+?)["'“”‘’`]/g;
  let match = quotedPattern.exec(String(value || ''));
  while (match) {
    const quoted = match[1]?.trim();
    if (quoted) texts.push(quoted);
    match = quotedPattern.exec(String(value || ''));
  }
  return texts;
}

function extractQuotedText(value: string): string {
  return extractQuotedTexts(value)[0] || '';
}

function extractLocalPath(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const windowsPath = value.match(/[a-z]:\\[^\s"'`]+(?:\s+[^\s"'`]+)*/i);
  if (windowsPath?.[0]) return windowsPath[0].trim().replace(/[.,;]+$/, '');
  const unixPath = value.match(/(?:\.{1,2}|~|\/)[^\s"'`]+/);
  return unixPath?.[0]?.trim().replace(/[.,;]+$/, '') || '';
}

function extractFilterQuery(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const cleaned = value
    .replace(
      /탐색기|파일|폴더|필터|검색|찾아|보여|표시|걸어줘|걸어|적용|에서|에|로|set|filter|search|find|explorer/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function extractTerminalCommand(rawText: string): string {
  const quoted = extractQuotedText(rawText);
  if (quoted) return quoted;
  return String(rawText || '')
    .replace(/^.*?(?:터미널에서|terminal\s+run|terminal에서|terminal)\s*/i, '')
    .replace(/(?:실행해줘|실행해|실행|돌려줘|돌려|run|execute|start).*$/i, '')
    .replace(/^[\s:：-]+|[\s.。]+$/g, '')
    .trim();
}

function toolOpenActionFromNaturalText(
  value: string,
  placement: XenesisDeskPlacement | undefined,
): XenesisDeskActionRequest | null {
  const definition = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CORE_TOOL_TARGETS);
  if (!definition) return null;
  return naturalAction(
    definition.id,
    definition.path,
    { placement: placement || 'tab' },
    `Open ${definition.reasonName} from natural language request.`,
  );
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

  return naturalAction(
    `natural-xenesis-guide-open-${guide.id}`,
    'xd.xenesis.guides.open',
    { id: guide.id, ensureVisible: true, ...(openFile ? { openFile: true } : {}) },
    `Open ${guide.label} guide${openFile ? ' file' : ''} from natural language request.`,
  );
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guide = xenesisGuideFromNaturalText(value);
  if (!guide) return null;

  return naturalAction(
    `natural-xenesis-guide-status-${guide.id}`,
    'xd.xenesis.guides.status',
    { id: guide.id },
    `Read ${guide.label} guide catalog status from natural language request.`,
  );
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

    return naturalAction(
      'natural-xenesis-onboarding-center-open',
      'xd.xenesis.onboarding.open',
      { ensureVisible: true },
      'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    );
  }

  return naturalAction(
    `natural-xenesis-onboarding-open-${step.id}`,
    'xd.xenesis.onboarding.open',
    { id: step.id, ensureVisible: true },
    `Open ${step.label} onboarding checklist step from natural language request.`,
  );
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  return naturalAction(
    `natural-xenesis-onboarding-status-${step.id}`,
    'xd.xenesis.onboarding.status',
    { id: step.id },
    `Read ${step.label} onboarding checklist status from natural language request.`,
  );
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
    return naturalAction(
      'natural-xenesis-tools-connectors-status',
      'xd.xenesis.tools.connectors.status',
      {},
      'Read external tool connector catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-mcp-install-drafts-status',
      'xd.xenesis.tools.mcpInstallDrafts.status',
      {},
      'Read external tool MCP install draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-oauth-drafts-status',
      'xd.xenesis.tools.oauthDrafts.status',
      {},
      'Read external tool OAuth draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-views-status',
      'xd.xenesis.tools.views.status',
      {},
      'Read external tool view catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-install-plans-status',
      'xd.xenesis.tools.installPlans.status',
      {},
      'Read external tool install plan catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-setup-status',
      'xd.xenesis.tools.setup.status',
      {},
      'Read external tool setup catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-actions-status',
      'xd.xenesis.tools.actions.status',
      {},
      'Read external tool action policy catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-user-stories-status',
      'xd.xenesis.tools.userStories.status',
      {},
      'Read external tool user-story catalog status from natural language request.',
    );
  }

  return null;
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-status',
      'xd.xenesis.channels.profileDrafts.status',
      {},
      'Read external messenger profile draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-routing-status',
      'xd.xenesis.channels.routing.status',
      {},
      'Read external messenger routing catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-safety-status',
      'xd.xenesis.channels.safety.status',
      {},
      'Read external messenger safety catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-access-groups-status',
      'xd.xenesis.channels.accessGroups.status',
      {},
      'Read external messenger access-group catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-pairing-status',
      'xd.xenesis.channels.pairing.status',
      {},
      'Read external messenger pairing catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-user-stories-status',
      'xd.xenesis.channels.userStories.status',
      {},
      'Read external messenger user-story catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-views-status',
      'xd.xenesis.messengers.views.status',
      {},
      'Read external messenger view catalog status from natural language request.',
    );
  }

  return null;
}

function hasXenesisConnectionContext(value: string): boolean {
  return hasAny(value, XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PROVIDER_TARGETS);
  if (provider) return provider;
  if (hasXenesisProviderProfileContext(value)) return { id: 'auto', label: 'auto' };
  return null;
}

function xenesisProviderAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisProviderProfileContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-routing-status',
      'xd.xenesis.providers.routing.status',
      {},
      'Read AI provider routing catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-views-status',
      'xd.xenesis.providers.views.status',
      {},
      'Read AI provider view catalog status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-profile-drafts-status',
      'xd.xenesis.providers.profileDrafts.status',
      {},
      'Read AI provider profile draft catalog status from natural language request.',
    );
  }

  return naturalAction(
    'natural-xenesis-providers-setup-status',
    'xd.xenesis.providers.setup.status',
    {},
    'Read AI provider setup catalog status from natural language request.',
  );
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const providerAggregateAction = xenesisProviderAggregateStatusActionFromNaturalText(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-routing-status-${provider.id}`,
      'xd.xenesis.providers.routing.status',
      { provider: provider.id },
      `Read ${provider.label} provider routing status from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-view-status-${provider.id}`,
      'xd.xenesis.providers.views.status',
      { provider: provider.id },
      `Read ${provider.label} provider view status from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-profile-draft-status-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.status',
      { provider: provider.id },
      `Read ${provider.label} provider profile draft status from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-provider-setup-status-${provider.id}`,
    'xd.xenesis.providers.setup.status',
    { provider: provider.id },
    `Read ${provider.label} provider setup status from natural language request.`,
  );
}

function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-status',
      'xd.xenesis.channels.profileDrafts.status',
      {},
      'Read external messenger profile draft catalog status from natural language request.',
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (target) {
    if (hasAny(value, XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-connection-diagnostics-status-${target.id}`,
        'xd.xenesis.connections.diagnostics.status',
        { id: target.id },
        `Read ${target.label} connection diagnostics from natural language request.`,
      );
    }

    if (hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-connection-setup-request-status-${target.id}`,
        'xd.xenesis.connections.setupRequests.status',
        { id: target.id },
        `Read ${target.label} connection setup request status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-mcp-install-draft-status-${target.id}`,
        'xd.xenesis.tools.mcpInstallDrafts.status',
        { tool: target.id },
        `Read ${target.label} MCP install draft status from natural language request.`,
      );
    }

    if (
      target.kind === 'tool' &&
      (target.id === 'google-calendar' || target.id === 'google-workspace') &&
      hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)
    ) {
      return naturalAction(
        `natural-xenesis-tool-oauth-draft-status-${target.id}`,
        'xd.xenesis.tools.oauthDrafts.status',
        { id: target.id },
        `Read ${target.label} OAuth draft status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-user-story-status-${target.id}`,
        'xd.xenesis.tools.userStories.status',
        { tool: target.id },
        `Read ${target.label} tool user story status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-action-policy-status-${target.id}`,
        'xd.xenesis.tools.actions.status',
        { tool: target.id },
        `Read ${target.label} tool action policy status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-install-plan-status-${target.id}`,
        'xd.xenesis.tools.installPlans.status',
        { tool: target.id },
        `Read ${target.label} tool install plan status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-setup-status-${target.id}`,
        'xd.xenesis.tools.setup.status',
        { id: target.id },
        `Read ${target.label} tool setup status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-connector-status-${target.id}`,
        'xd.xenesis.tools.connectors.status',
        { tool: target.id },
        `Read ${target.label} tool connector status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-tool-view-status-${target.id}`,
        'xd.xenesis.tools.views.status',
        { id: target.id },
        `Read ${target.label} tool view status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-routing-status-${target.id}`,
        'xd.xenesis.channels.routing.status',
        { channel: target.id },
        `Read ${target.label} channel routing status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-safety-status-${target.id}`,
        'xd.xenesis.channels.safety.status',
        { channel: target.id },
        `Read ${target.label} channel safety status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-access-groups-status-${target.id}`,
        'xd.xenesis.channels.accessGroups.status',
        { channel: target.id },
        `Read ${target.label} channel access groups status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-pairing-status-${target.id}`,
        'xd.xenesis.channels.pairing.status',
        { channel: target.id },
        `Read ${target.label} channel pairing status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-user-story-status-${target.id}`,
        'xd.xenesis.channels.userStories.status',
        { id: target.id },
        `Read ${target.label} channel user story status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-channel-profile-draft-status-${target.id}`,
        'xd.xenesis.channels.profileDrafts.status',
        { channel: target.id },
        `Read ${target.label} channel profile draft status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS)) {
      return naturalAction(
        `natural-xenesis-messenger-view-status-${target.id}`,
        'xd.xenesis.messengers.views.status',
        { id: target.id },
        `Read ${target.label} messenger view status from natural language request.`,
      );
    }

    return naturalAction(
      `natural-xenesis-connection-diagnostics-status-${target.id}`,
      'xd.xenesis.connections.diagnostics.status',
      { id: target.id },
      `Read ${target.label} connection diagnostics from natural language request.`,
    );
  }

  if (hasXenesisGuideCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-guides-status',
      'xd.xenesis.guides.status',
      {},
      'Read Xenesis guide catalog status from natural language request.',
    );
  }

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-diagnostics-status',
      'xd.xenesis.connections.diagnostics.status',
      {},
      'Read Xenesis connection diagnostics catalog from natural language request.',
    );
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-setup-requests-status',
      'xd.xenesis.connections.setupRequests.status',
      {},
      'Read Xenesis connection setup request catalog from natural language request.',
    );
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

    return naturalAction(
      'natural-xenesis-onboarding-status',
      'xd.xenesis.onboarding.status',
      {},
      'Read Xenesis onboarding status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_GUIDE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-guides-status',
      'xd.xenesis.guides.status',
      {},
      'Read Xenesis guide catalog status from natural language request.',
    );
  }

  if (hasXenesisConnectionContext(value)) {
    return naturalAction(
      'natural-xenesis-connections-status',
      'xd.xenesis.connections.status',
      {},
      'Read Xenesis connection status from natural language request.',
    );
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
    return naturalAction(
      `natural-xenesis-provider-profile-draft-request-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.request',
      { provider: provider.id },
      provider.id === 'auto'
        ? 'Request AI provider profile draft review from natural language request.'
        : `Request ${provider.label} provider profile draft review from natural language request.`,
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-install-plan-request-${target.id}`,
      'xd.xenesis.tools.installPlans.request',
      { id: target.id },
      `Request ${target.label} tool install plan review from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-mcp-install-draft-request-${target.id}`,
      'xd.xenesis.tools.mcpInstallDrafts.request',
      { id: target.id },
      `Request ${target.label} MCP install draft review from natural language request.`,
    );
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)
  ) {
    return naturalAction(
      `natural-xenesis-tool-oauth-draft-request-${target.id}`,
      'xd.xenesis.tools.oauthDrafts.request',
      { id: target.id },
      `Request ${target.label} OAuth draft review from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-action-policy-request-${target.id}`,
      'xd.xenesis.tools.actions.request',
      { id: target.id },
      `Request ${target.label} tool action policy review from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-profile-draft-request-${target.id}`,
      'xd.xenesis.channels.profileDrafts.request',
      { channel: target.id },
      `Request ${target.label} channel profile draft review from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-connection-setup-request-${target.id}`,
    'xd.xenesis.connections.setupRequests.request',
    { id: target.id },
    `Request ${target.label} connection setup review from natural language request.`,
  );
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-routing-open-${provider.id}`,
      'xd.xenesis.providers.routing.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider routing from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-profile-draft-open-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider profile draft from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-view-open-${provider.id}`,
      'xd.xenesis.providers.views.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider view from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-provider-setup-open-${provider.id}`,
      'xd.xenesis.providers.setup.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider setup from natural language request.`,
    );
  }

  return null;
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisGuideCatalogContext(value)) return null;

  return naturalAction(
    'natural-xenesis-guides-catalog-open',
    'xd.xenesis.guides.open',
    { ensureVisible: true },
    'Open Xenesis guide catalog in Connection Center from natural language request.',
  );
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-routing-catalog-open',
      'xd.xenesis.providers.routing.open',
      { ensureVisible: true },
      'Open AI provider routing in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-setup-catalog-open',
      'xd.xenesis.providers.setup.open',
      { ensureVisible: true },
      'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-views-catalog-open',
      'xd.xenesis.providers.views.open',
      { ensureVisible: true },
      'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-providers-profile-drafts-catalog-open',
      'xd.xenesis.providers.profileDrafts.open',
      { ensureVisible: true },
      'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value)) {
    return naturalAction(
      'natural-xenesis-provider-catalog-open',
      'xd.xenesis.providers.setup.open',
      { ensureVisible: true },
      'Open AI provider catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-connectors-catalog-open',
      'xd.xenesis.tools.connectors.open',
      { ensureVisible: true },
      'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_DRAFT_CONTEXT_WORDS)
  ) {
    return naturalAction(
      'natural-xenesis-tools-mcp-install-drafts-catalog-open',
      'xd.xenesis.tools.mcpInstallDrafts.open',
      { ensureVisible: true },
      'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_OAUTH_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-oauth-drafts-catalog-open',
      'xd.xenesis.tools.oauthDrafts.open',
      { ensureVisible: true },
      'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-views-catalog-open',
      'xd.xenesis.tools.views.open',
      { ensureVisible: true },
      'Open external tool view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-install-plans-catalog-open',
      'xd.xenesis.tools.installPlans.open',
      { ensureVisible: true },
      'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-setup-catalog-open',
      'xd.xenesis.tools.setup.open',
      { ensureVisible: true },
      'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-actions-catalog-open',
      'xd.xenesis.tools.actions.open',
      { ensureVisible: true },
      'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-tools-user-stories-catalog-open',
      'xd.xenesis.tools.userStories.open',
      { ensureVisible: true },
      'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-tool-catalog-open',
      'xd.xenesis.tools.setup.open',
      { ensureVisible: true },
      'Open external tool catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-catalog-open',
      'xd.xenesis.channels.profileDrafts.open',
      { ensureVisible: true },
      'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-routing-catalog-open',
      'xd.xenesis.channels.routing.open',
      { ensureVisible: true },
      'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-safety-catalog-open',
      'xd.xenesis.channels.safety.open',
      { ensureVisible: true },
      'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-access-groups-catalog-open',
      'xd.xenesis.channels.accessGroups.open',
      { ensureVisible: true },
      'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-pairing-catalog-open',
      'xd.xenesis.channels.pairing.open',
      { ensureVisible: true },
      'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-user-stories-catalog-open',
      'xd.xenesis.channels.userStories.open',
      { ensureVisible: true },
      'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-messengers-views-catalog-open',
      'xd.xenesis.messengers.views.open',
      { ensureVisible: true },
      'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messenger-catalog-open',
      'xd.xenesis.messengers.views.open',
      { ensureVisible: true },
      'Open external messenger catalog in Xenesis Connection Center from natural language request.',
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

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-diagnostics-catalog-open',
      'xd.xenesis.connections.diagnostics.open',
      { ensureVisible: true },
      'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
    );
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-setup-requests-catalog-open',
      'xd.xenesis.connections.setupRequests.open',
      { ensureVisible: true },
      'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-connections-center-open',
      'xd.xenesis.connections.open',
      { ensureVisible: true },
      'Open Xenesis Connection Center from natural language request.',
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-connection-diagnostics-open-${target.id}`,
      'xd.xenesis.connections.diagnostics.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} connection diagnostics from natural language request.`,
    );
  }

  if (hasAny(value, XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-connection-setup-request-open-${target.id}`,
      'xd.xenesis.connections.setupRequests.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} connection setup request from natural language request.`,
    );
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS)
  ) {
    return naturalAction(
      `natural-xenesis-tool-oauth-draft-open-${target.id}`,
      'xd.xenesis.tools.oauthDrafts.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} OAuth draft from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-mcp-install-draft-open-${target.id}`,
      'xd.xenesis.tools.mcpInstallDrafts.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} MCP install draft from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-user-story-open-${target.id}`,
      'xd.xenesis.tools.userStories.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool user story from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-action-policy-open-${target.id}`,
      'xd.xenesis.tools.actions.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool action policy from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-install-plan-open-${target.id}`,
      'xd.xenesis.tools.installPlans.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool install plan from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-connector-open-${target.id}`,
      'xd.xenesis.tools.connectors.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool connector from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_SETUP_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-setup-open-${target.id}`,
      'xd.xenesis.tools.setup.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool setup from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-tool-view-open-${target.id}`,
      'xd.xenesis.tools.views.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool view from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-user-story-open-${target.id}`,
      'xd.xenesis.channels.userStories.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} channel user story from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-profile-draft-open-${target.id}`,
      'xd.xenesis.channels.profileDrafts.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel profile draft from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-routing-open-${target.id}`,
      'xd.xenesis.channels.routing.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel routing from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_SAFETY_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-safety-open-${target.id}`,
      'xd.xenesis.channels.safety.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel safety from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-access-groups-open-${target.id}`,
      'xd.xenesis.channels.accessGroups.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel access groups from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-channel-pairing-open-${target.id}`,
      'xd.xenesis.channels.pairing.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel pairing from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS)) {
    return naturalAction(
      `natural-xenesis-messenger-view-open-${target.id}`,
      'xd.xenesis.messengers.views.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} messenger view from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-connection-open-${target.id}`,
    'xd.xenesis.connections.open',
    { id: target.id, ensureVisible: true },
    `Open ${target.label} connection card from natural language request.`,
  );
}

function localCliMcpReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const wantsReadback = hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS);

  if (
    hasAny(value, XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS)
  ) {
    return naturalAction(
      'natural-local-cli-scan',
      'xd.localCli.scan',
      {},
      'Scan local CLI agents from natural language request.',
    );
  }

  if (wantsReadback && hasAny(value, XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-mcp-bridge-status',
      'xd.mcp.bridge.status',
      {},
      'Read MCP bridge status from natural language request.',
    );
  }

  if (wantsReadback && hasAny(value, XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-mcp-settings-status',
      'xd.mcp.settings.status',
      {},
      'Read MCP settings status from natural language request.',
    );
  }

  return null;
}

function xenesisGatewayActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalAction(
      'natural-xenesis-gateway-dashboard-open',
      'xd.xenesis.gateway.openDashboard',
      {},
      'Open Xenesis gateway dashboard from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS)) {
    return naturalAction(
      'natural-xenesis-gateway-status',
      'xd.xenesis.gateway.status',
      {},
      'Read Xenesis gateway status from natural language request.',
    );
  }

  return null;
}

function xenesisAgentReadbackActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_AGENT_CONTEXT_WORDS)) return null;

  const agentId = extractQuotedText(rawText);
  if (!agentId) return null;

  if (hasAny(value, XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-agent-events',
      'xd.xenesis.agents.events',
      { agentId },
      'List Xenesis Agent pane events from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_READBACK_WORDS)) {
    return naturalAction(
      'natural-xenesis-agent-status',
      'xd.xenesis.agents.status',
      { agentId },
      'Read Xenesis Agent pane status from natural language request.',
    );
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
    return naturalAction(
      'natural-xenesis-status',
      'xd.xenesis.status',
      {},
      'Read Xenesis runtime status from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_REPORT_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalAction(
      'natural-xenesis-reports-list',
      'xd.xenesis.reports.list',
      {},
      'List Xenesis reports from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_TASK_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalAction(
      'natural-xenesis-tasks-list',
      'xd.xenesis.tasks.list',
      {},
      'List Xenesis tasks from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_AGENT_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_LIST_OR_SHOW_WORDS)) {
    return naturalAction(
      'natural-xenesis-agents-list',
      'xd.xenesis.agents.list',
      {},
      'List registered Xenesis Agent panes from natural language request.',
    );
  }

  if (hasAny(value, XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-diagnostics',
      'xd.xenesis.diagnostics',
      {},
      'Read Xenesis operational diagnostics from natural language request.',
    );
  }

  return null;
}

function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_PROFILE_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-profiles-list',
      'xd.xenesis.profiles.list',
      {},
      'List Xenesis profiles from natural language request.',
    );
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

  return naturalAction(
    'natural-xenesis-agent-submit',
    'xd.xenesis.agents.submit',
    { agentId, text },
    'Submit Xenesis Agent pane message from natural language request.',
  );
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  if (!hasAny(intentValue, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_RUN_CONTEXT_WORDS)) return null;
  if (!hasAny(intentValue, XENESIS_NATURAL_RUN_START_CONTEXT_WORDS)) return null;
  if (hasAny(intentValue, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS)) return null;

  const prompt = extractQuotedText(rawText);
  if (!prompt) return null;

  return naturalAction(
    'natural-xenesis-runs-start',
    'xd.xenesis.runs.start',
    { prompt },
    'Start Xenesis run from natural language request.',
  );
}

function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;

  if (hasAny(value, XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS)) {
    return naturalAction(
      'natural-xenesis-runs-cancel',
      'xd.xenesis.runs.cancel',
      {},
      'Cancel active Xenesis run from natural language request.',
    );
  }

  if (
    hasAny(value, XENESIS_NATURAL_SESSION_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS)
  ) {
    return naturalAction(
      'natural-xenesis-sessions-reset',
      'xd.xenesis.sessions.reset',
      {},
      'Reset active Xenesis session from natural language request.',
    );
  }

  return null;
}

function xenesisWorkspaceSetActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, XENESIS_NATURAL_XENESIS_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS)) return null;
  if (!hasAny(value, XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS)) return null;

  const path = extractLocalPath(rawText);
  if (!path) return null;

  return naturalAction(
    'natural-xenesis-workspace-set',
    'xd.xenesis.workspace.set',
    { path },
    'Set Xenesis workspace from natural language request.',
  );
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || '').trim();
  const value = normalizeNaturalLanguageText(rawText);
  if (!value || !hasActionIntent(value)) return emptyNaturalPlan();

  const placement = detectPlacement(value);

  const xenesisAgentSubmitAction = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (xenesisAgentSubmitAction) {
    return naturalPlan('Xenesis Agent 메시지 제출 요청을 기록합니다.', [xenesisAgentSubmitAction]);
  }

  const xenesisRunStartAction = xenesisRunStartActionFromNaturalText(rawText);
  if (xenesisRunStartAction) {
    return naturalPlan('Xenesis 런타임 실행 요청을 기록합니다.', [xenesisRunStartAction]);
  }

  const xenesisWorkspaceSetAction = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (xenesisWorkspaceSetAction) {
    return naturalPlan('Xenesis 워크스페이스 설정 요청을 기록합니다.', [xenesisWorkspaceSetAction]);
  }

  const xenesisConnectionReviewRequestAction = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (xenesisConnectionReviewRequestAction) {
    return naturalPlan('Xenesis 연결 검토 요청을 기록합니다.', [xenesisConnectionReviewRequestAction]);
  }

  const explicitXenesisConnectionOpenAction = xenesisConnectionActionFromNaturalText(value);
  if (explicitXenesisConnectionOpenAction && hasAny(value, XENESIS_NATURAL_OPEN_COMMAND_WORDS)) {
    return naturalPlan('Xenesis 연결 표면을 엽니다.', [explicitXenesisConnectionOpenAction]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return naturalPlan('Xenesis 연결 상태를 조회합니다.', [xenesisConnectionReadbackAction]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalPlan('Xenesis 연결 표면을 엽니다.', [xenesisConnectionAction]);
  }

  const localCliMcpReadbackAction = localCliMcpReadbackActionFromNaturalText(value);
  if (localCliMcpReadbackAction) {
    return naturalPlan('로컬 CLI/MCP 상태를 조회합니다.', [localCliMcpReadbackAction]);
  }

  const xenesisGatewayAction = xenesisGatewayActionFromNaturalText(value);
  if (xenesisGatewayAction) {
    return naturalPlan('Xenesis gateway 상태를 조회하거나 엽니다.', [xenesisGatewayAction]);
  }

  const xenesisRuntimeInventoryAction = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (xenesisRuntimeInventoryAction) {
    return naturalPlan('Xenesis 런타임 인벤토리를 조회합니다.', [xenesisRuntimeInventoryAction]);
  }

  const xenesisProfileInventoryAction = xenesisProfileInventoryActionFromNaturalText(value);
  if (xenesisProfileInventoryAction) {
    return naturalPlan('Xenesis 프로필 목록을 조회합니다.', [xenesisProfileInventoryAction]);
  }

  const xenesisRuntimeControlAction = xenesisRuntimeControlActionFromNaturalText(value);
  if (xenesisRuntimeControlAction) {
    return naturalPlan('Xenesis 런타임 제어 요청을 기록합니다.', [xenesisRuntimeControlAction]);
  }

  if (hasAny(value, XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalPlan('설정 패인을 엽니다.', [
      naturalAction(
        'natural-settings-open',
        'xd.panes.settings.open',
        { placement: placement || 'tab' },
        'Open settings from natural language request.',
      ),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS)
  ) {
    return naturalPlan('진단 패인을 엽니다.', [
      naturalAction(
        'natural-diagnostics-open',
        'xd.panes.diagnostics.open',
        { placement: placement || 'tab' },
        'Open diagnostics from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS)) {
    return naturalPlan('Capability Explorer를 엽니다.', [
      naturalAction(
        'natural-capability-explorer-open',
        'xd.tools.core.capabilityExplorer.open',
        { placement: placement || 'tab' },
        'Open Capability Explorer from natural language request.',
      ),
    ]);
  }

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && hasAny(value, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS)) {
    return naturalPlan('요청한 도구 패널을 엽니다.', [toolOpenAction]);
  }

  if (hasAny(value, XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS)) {
      return naturalPlan('캡처 목록을 조회합니다.', [
        naturalAction('natural-capture-list', 'xd.capture.list', {}, 'List captures from natural language request.'),
      ]);
    }
    return naturalPlan('현재 패인을 캡처합니다.', [
      naturalAction(
        'natural-capture-active-pane',
        'xd.capture.activePane',
        {},
        'Capture the active pane from natural language request.',
      ),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS)
  ) {
    return naturalPlan('현재 도킹 콘텐츠에 포커스를 맞춥니다.', [
      naturalAction(
        'natural-dock-focus-active',
        'xd.dock.focus',
        { useActive: true },
        'Focus the active dock content from natural language request.',
      ),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS)
  ) {
    let id = 'natural-dock-close-active';
    let path = 'xd.dock.close';
    let reason = 'Close the active dock content from natural language request.';
    if (hasAny(value, XENESIS_NATURAL_RIGHT_SCOPE_WORDS)) {
      id = 'natural-dock-close-right-active';
      path = 'xd.dock.closeRight';
      reason = 'Close tabs to the right of active dock content from natural language request.';
    } else if (hasAny(value, XENESIS_NATURAL_OTHER_SCOPE_WORDS)) {
      id = 'natural-dock-close-others-active';
      path = 'xd.dock.closeOthers';
      reason = 'Close other tabs around active dock content from natural language request.';
    } else if (hasAny(value, XENESIS_NATURAL_ALL_SCOPE_WORDS)) {
      id = 'natural-dock-close-all-active';
      path = 'xd.dock.closeAll';
      reason = 'Close all tabs in active dock pane from natural language request.';
    }
    return naturalPlan('현재 도킹 콘텐츠를 닫습니다.', [naturalAction(id, path, { useActive: true }, reason)]);
  }

  const dockSide = detectDockSide(value);
  const dockSize = extractFirstInteger(value, 120, 4096);
  if (
    dockSide &&
    dockSize &&
    hasAny(value, XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_RESIZE_COMMAND_WORDS)
  ) {
    return naturalPlan('도킹 영역 크기를 변경합니다.', [
      naturalAction(
        'natural-dock-size-set',
        'xd.dock.sizes.set',
        { [dockSide]: dockSize },
        'Resize a dock side from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS) || detectWindowSizerPreset(value)) {
    const presetId = detectWindowSizerPreset(value);
    if (presetId) {
      return naturalPlan(`창 크기를 ${presetId.toUpperCase()} 프리셋으로 변경합니다.`, [
        naturalAction(
          'natural-window-size-preset',
          'xd.window.sizer.applyPreset',
          { presetId },
          'Apply window size preset from natural language request.',
        ),
      ]);
    }
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS)) {
    return naturalPlan('열린 파일 목록을 조회합니다.', [
      naturalAction(
        'natural-files-list-open',
        'xd.files.listOpen',
        {},
        'List open files from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_GENERIC_OPEN_WORDS)) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan('파일을 엽니다.', [
      naturalAction(
        'natural-file-open',
        'xd.files.open',
        filePath ? { filePath } : {},
        'Open file from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_FILE_CONTEXT_WORDS) && hasAny(value, XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS)) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan('파일 내용을 읽습니다.', [
      naturalAction(
        'natural-file-read',
        'xd.files.read',
        filePath ? { filePath } : {},
        'Read file from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS)) {
      return naturalPlan('탐색기를 숨깁니다.', [
        naturalAction(
          'natural-explorer-hide',
          'xd.explorer.local.hide',
          {},
          'Hide explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS)) {
      return naturalPlan('탐색기 표시 상태를 전환합니다.', [
        naturalAction(
          'natural-explorer-toggle',
          'xd.explorer.local.toggle',
          {},
          'Toggle explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_REFRESH_CONTEXT_WORDS)) {
      return naturalPlan('탐색기를 새로고침합니다.', [
        naturalAction(
          'natural-explorer-refresh',
          'xd.explorer.local.refresh',
          {},
          'Refresh explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS)) {
      return naturalPlan('탐색기를 상위 폴더로 이동합니다.', [
        naturalAction(
          'natural-explorer-go-up',
          'xd.explorer.local.goUp',
          {},
          'Go to parent folder from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_FILTER_CONTEXT_WORDS)) {
      const query = extractFilterQuery(rawText);
      return naturalPlan('탐색기 필터를 적용합니다.', [
        naturalAction(
          'natural-explorer-filter',
          'xd.explorer.local.setFilter',
          { query },
          'Filter explorer from natural language request.',
        ),
      ]);
    }
    const path = extractLocalPath(rawText);
    if (path) {
      return naturalPlan('탐색기 위치를 이동합니다.', [
        naturalAction(
          'natural-explorer-navigate',
          'xd.explorer.local.navigate',
          { path },
          'Navigate explorer from natural language request.',
        ),
      ]);
    }
    return naturalPlan('탐색기를 표시합니다.', [
      naturalAction(
        'natural-explorer-show',
        'xd.explorer.local.show',
        {},
        'Show explorer from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS)) {
    return naturalPlan('즐겨찾기 패널을 표시합니다.', [
      naturalAction(
        'natural-favorites-show',
        'xd.favorites.showTab',
        {},
        'Show favorites from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS)) {
    if (hasAny(value, XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS)) {
      return naturalPlan('터미널 목록을 조회합니다.', [
        naturalAction(
          'natural-terminals-list',
          'xd.terminals.list',
          {},
          'List terminals from natural language request.',
        ),
      ]);
    }

    const count = extractFirstInteger(value, 1, 50);
    if (count && count > 1 && hasAny(value, XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS)) {
      const actions = [
        naturalAction(
          'natural-terminal-run-many',
          'xd.terminals.runMany',
          {
            count,
            shell: 'powershell',
            command: 'Write-Host Xenesis-Desk-terminal',
            idPrefix: 'xenesis-agent-natural',
            placement: placement || 'tab',
          },
          'Open multiple terminals from natural language request.',
        ),
      ];
      const arrangeMode = detectArrangeMode(value);
      if (arrangeMode && hasAny(value, XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS)) {
        actions.push(
          naturalAction(
            'natural-dock-window-arrange',
            'xd.dock.window.arrange',
            { windowState: detectDockWindowState(value) || 'document', mode: arrangeMode },
            'Arrange a Desk window area from natural language request.',
          ),
        );
      }
      return naturalPlan('터미널을 여러 개 열고 필요한 배열을 적용합니다.', actions);
    }

    if (hasAny(value, XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS)) {
      const command = extractTerminalCommand(rawText);
      return naturalPlan('터미널 명령을 실행합니다.', [
        naturalAction(
          'natural-terminal-run',
          'xd.terminals.run',
          {
            command: command || 'Write-Host Xenesis-Desk-terminal',
            shell: 'powershell',
            placement: placement || 'tab',
          },
          'Run terminal command from natural language request.',
        ),
      ]);
    }
  }

  const scopedArrangeMode = detectArrangeMode(value);
  if (scopedArrangeMode && hasAny(value, XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS)) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan('지정한 Desk 영역을 정렬합니다.', [
        naturalAction(
          'natural-dock-window-arrange',
          'xd.dock.window.arrange',
          { windowState, mode: scopedArrangeMode },
          'Arrange a Desk window area from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_PANE_CONTEXT_WORDS)) {
      return naturalPlan('현재 도킹 패인을 정렬합니다.', [
        naturalAction(
          'natural-dock-pane-arrange',
          'xd.dock.pane.arrange',
          { useActive: true, mode: scopedArrangeMode },
          'Arrange the active dock pane from natural language request.',
        ),
      ]);
    }
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS)) {
    return naturalPlan('현재 도킹 그룹을 바둑판으로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-grid',
        'xd.dock.arrangeGrid',
        {},
        'Arrange dock group as grid from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS)) {
    return naturalPlan('현재 도킹 그룹을 가로로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-horizontal',
        'xd.dock.arrangeHorizontal',
        {},
        'Arrange dock group horizontally from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS)) {
    return naturalPlan('현재 도킹 그룹을 세로로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-vertical',
        'xd.dock.arrangeVertical',
        {},
        'Arrange dock group vertically from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS)) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan('지정한 Desk 영역의 도킹 배열을 합칩니다.', [
        naturalAction(
          'natural-dock-window-merge',
          'xd.dock.window.merge',
          { windowState },
          'Merge a Desk window area from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, XENESIS_NATURAL_PANE_CONTEXT_WORDS)) {
      return naturalPlan('현재 도킹 패인의 배열을 합칩니다.', [
        naturalAction(
          'natural-dock-pane-merge',
          'xd.dock.pane.merge',
          { useActive: true },
          'Merge the active dock pane from natural language request.',
        ),
      ]);
    }
    const path = hasAny(value, XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS)
      ? 'xd.dock.mergeAll'
      : 'xd.dock.mergeGroup';
    return naturalPlan('도킹 배열을 합칩니다.', [
      naturalAction('natural-dock-merge', path, {}, 'Merge dock layout from natural language request.'),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS)) {
    return naturalPlan('열린 패인 목록을 조회합니다.', [
      naturalAction(
        'natural-dock-panes-list',
        'xd.dock.panes.list',
        {},
        'List dock panes from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS)) {
    return naturalPlan('현재 패인을 아티팩트 대상으로 지정합니다.', [
      naturalAction(
        'natural-artifact-target-set',
        'xd.dock.artifactTarget.set',
        { useActive: true },
        'Set active pane as artifact target from natural language request.',
      ),
    ]);
  }

  if (
    hasAny(value, XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS) &&
    hasAny(value, XENESIS_NATURAL_APP_STATUS_TARGET_WORDS)
  ) {
    return naturalPlan('앱 상태를 조회합니다.', [
      naturalAction('natural-app-status', 'xd.app.status', {}, 'Read app status from natural language request.'),
    ]);
  }

  const view = viewKindFromNaturalText(value);
  if (view && hasAny(value, XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS)) {
    return naturalPlan('요청한 화면을 엽니다.', [
      naturalAction(view.id, 'xd.views.open', withPlacement({ kind: view.kind }, placement, 'tab'), view.reason),
    ]);
  }

  return emptyNaturalPlan();
}

function normalizeDeskActionRecord(
  value: unknown,
  index: number,
): { action?: XenesisDeskActionRequest; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: `Desk action ${index + 1} must be a JSON object.` };
  }

  const record = value as Record<string, unknown>;
  const path = typeof record.path === 'string' ? record.path.trim() : '';
  if (!path) return { error: `Desk action ${index + 1} is missing path.` };
  if (!path.startsWith('xd.')) return { error: `Desk action ${index + 1} path must start with xd.: ${path}` };

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
    sourceText.replace(DESK_ACTION_FENCE_PATTERN, (_block, blockJsonText: string, inlineJsonText?: string) => {
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
        errors.push(`Desk action JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return '';
    }),
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
    (!result.ok && /requires approval|approval required/i.test(result.error || ''))
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

function firstReadableTitle(value: unknown): string {
  if (typeof value === 'string') return basename(value) || value;
  const record = asRecord(value);
  return (
    basename(record.title) ||
    basename(record.name) ||
    basename(record.filePath) ||
    basename(record.path) ||
    basename(record.uri)
  );
}

function summarizeFileList(record: Record<string, unknown>): string {
  const files = arrayFromRecord(record, ['openFiles', 'files', 'items', 'entries']);
  if (files.length === 0) return '';
  const title = firstReadableTitle(files[0]);
  const suffix = files.length === 1 ? '1 file' : `${files.length} files`;
  return title ? `${suffix}, first: ${title}` : suffix;
}

function summarizeCaptureResult(record: Record<string, unknown>): string {
  const nested = asRecord(record.capture);
  const file =
    basename(record.filePath) ||
    basename(record.path) ||
    basename(record.outputPath) ||
    basename(nested.filePath) ||
    basename(nested.path);
  const width =
    typeof record.width === 'number' ? record.width : typeof nested.width === 'number' ? nested.width : undefined;
  const height =
    typeof record.height === 'number' ? record.height : typeof nested.height === 'number' ? nested.height : undefined;
  const size = width && height ? `${width}x${height}` : '';
  return [file, size].filter(Boolean).join(' ');
}

function summarizeBoundsResult(record: Record<string, unknown>): string {
  const bounds = asRecord(record.bounds);
  const width =
    typeof bounds.width === 'number' ? bounds.width : typeof record.width === 'number' ? record.width : undefined;
  const height =
    typeof bounds.height === 'number' ? bounds.height : typeof record.height === 'number' ? record.height : undefined;
  if (!width || !height) return '';
  return `${width}x${height}`;
}

function summarizeWorkflowResult(record: Record<string, unknown>): string {
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'workflow';
  const completed = typeof record.completed === 'number' ? record.completed : undefined;
  const passed = typeof record.passed === 'number' ? record.passed : undefined;
  const failed = typeof record.failed === 'number' ? record.failed : undefined;
  const skipped = typeof record.skipped === 'number' ? record.skipped : undefined;
  const parts = [
    completed !== undefined ? `${completed} completed` : '',
    passed !== undefined ? `${passed} passed` : '',
    failed !== undefined ? `${failed} failed` : '',
    skipped !== undefined ? `${skipped} skipped` : '',
  ].filter(Boolean);
  return parts.length ? `${name}: ${parts.join(', ')}` : name;
}

function summarizeDeskActionResult(result: XenesisDeskActionExecutionResult): string {
  const record = asRecord(result.result);
  if (result.path === 'xd.files.listOpen') return summarizeFileList(record);
  if (result.path === 'xd.capture.activePane') return summarizeCaptureResult(record);
  if (result.path === 'xd.window.sizer.applyPreset') return summarizeBoundsResult(record);
  if (result.path === 'xd.automation.workflow.run') return summarizeWorkflowResult(record);

  const renderer = asRecord(record.renderer);
  const message =
    typeof record.message === 'string' ? record.message : typeof renderer.message === 'string' ? renderer.message : '';
  if (message) return message;

  const compact = compactJson(result.result);
  if (!compact || compact === '{}' || compact === '[]') return '';
  return compact;
}

export function buildXenesisDeskActionPendingMessage(actions: XenesisDeskActionRequest[], leadText = ''): string {
  return [
    leadText.trim(),
    leadText.trim() ? '' : undefined,
    'Desk action approval required.',
    '아래 Desk 동작은 실행 전에 승인이 필요합니다. 계속하려면 `승인`이라고 입력하거나 승인 버튼을 눌러 주세요.',
    '',
    ...actions.map(describeDeskAction),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  const failed = results.filter((result) => !result.ok);
  const successful = results.filter((result) => result.ok);
  const header = failed.length > 0 ? `Desk action completed with ${failed.length} issue(s).` : 'Desk action completed.';
  const appliedLines = successful.map((result) => {
    const summary = summarizeDeskActionResult(result);
    return summary ? `- ${result.path}: ${summary}` : `- ${result.path}`;
  });
  return [
    header,
    ...(successful.length > 0 ? ['', 'Applied:', ...appliedLines] : []),
    ...(failed.length > 0
      ? ['', 'Needs attention:', ...failed.map((result) => `- ${result.path}: ${result.error || 'failed'}`)]
      : []),
  ].join('\n');
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return `${result.ok ? 'Desk action applied' : 'Desk action failed'}: ${result.path}`;
}

const XENESIS_CONNECTION_CENTER_HINT_PREFIXES = [
  'xd.xenesis.connections',
  'xd.xenesis.onboarding',
  'xd.xenesis.guides',
  'xd.xenesis.providers',
  'xd.xenesis.tools',
  'xd.xenesis.channels',
  'xd.xenesis.messengers',
] as const;

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
  const crPathPattern = /\bxd\.[A-Za-z0-9.*{}.-]+/g;
  for (const line of lines) {
    for (const match of line.matchAll(crPathPattern)) {
      const path = match[0].replace(/[.,;:)]$/, '');
      if (callablePaths.has(path)) {
        referencedPaths.add(path);
      }
    }
  }
  return [...referencedPaths].join(', ');
}

export function buildXenesisDeskControlPromptHint(): string {
  const lines = [
    'Native Xenesis Desk Capability Registry control:',
    '- You are running inside Xenesis Desk. Use the native Capability Registry directly for Desk control; do not require external MCP, skills, or plugins for built-in Desk actions.',
    '- When a Desk action is needed, include a fenced JSON block using exactly ```xenesis-desk-action.',
    '- If the user asks you to open, focus, capture, arrange, resize, inspect, or test a Desk surface, you MUST return a `xenesis-desk-action` block for the requested Desk operation.',
    '- Each action must use an `xd.*` Capability Registry path and optional `args` object.',
    '- Use read-only actions first when inspecting state. Use approval-gated control actions only when the user clearly asked for the operation.',
    '- For ordered multi-step Desk control, prefer `xd.automation.workflow.preview` to validate the plan and `xd.automation.workflow.run` to execute the approved plan. Put ordered CR calls under `args.steps` instead of emitting many unrelated action blocks.',
    '- Do not refuse a requested Desk UI control action solely because the language runtime is read-only. Returning a `xenesis-desk-action` block is a request to Xenesis Desk; the Capability Registry will enforce permissions, approvals, and failures after your response.',
    '- Returning a `xenesis-desk-action` block is not executing code, running shell commands, or editing files. The file/process sandbox does not apply to a Desk action request; Xenesis Desk validates and executes the request through the Capability Registry after the model response.',
    '- If a requested Desk action is reasonable but may need approval, include the action block with `approved:true` only when the user already gave clear approval in the conversation. Otherwise explain the needed approval and omit `approved:true`. This applies to `xd.automation.workflow.run` as well.',
    '- Keep the normal user-facing answer outside the action block. The action block is for Xenesis Desk to execute internally.',
    '- Prefer `xd.views.open` for opening built-in surfaces. Use `kind:"gowoori"` for the artifact viewer, `kind:"gowooriChat"` only when the user explicitly asks for GowooriChat or Xenesis Agent needs a fallback, `kind:"terminal"` for terminals, and `kind:"xenesisAgent"` for Xenesis Agent.',
    '- Use `placement:"tab"`, `"right"`, `"left"`, `"top"`, or `"bottom"` when opening views. If a specific pane is known, pass `targetPaneId`.',
    '- Use `xd.window.sizer.applyPreset` with `args.presetId`, for example `{"presetId":"qhd"}`.',
    '- Use `xd.dock.artifactTarget.set` with `args.paneId` after opening a Gowoori pane that should receive artifacts.',
    '- Use Connection Center CR paths from the Capability Registry to inspect readiness, focus provider/tool/messenger cards, open diagnostics and setup requests, follow onboarding steps, and open repo-local guides.',
    '- Use provider setup, routing, view, and profile-draft CR paths from the Capability Registry before changing provider-related Desk state.',
    '- Use `xd.localCli.scan`, `xd.mcp.settings.status`, and `xd.mcp.bridge.status` to inspect local CLI discovery and MCP setup or bridge readiness before suggesting installs, config writes, gateway starts, or local CLI switching.',
    '- Use `xd.xenesis.gateway.status` to inspect runtime gateway readiness and `xd.xenesis.gateway.openDashboard` to open the Desk gateway dashboard; do not start, stop, or restart the gateway unless the user clearly asks and approval policy is satisfied.',
    '- Use `xd.xenesis.workspace.set` only when the user clearly asks to bind the Xenesis workspace to a specific local path; leave approval handling to the Capability Registry, especially for outside-workspace paths.',
    '- Use `xd.xenesis.status` to inspect gateway, workspace, and active-run status before starting runs, changing workspaces, or troubleshooting runtime setup.',
    '- Use `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`, `xd.xenesis.tasks.list`, `xd.xenesis.agents.list`, `xd.xenesis.agents.status`, `xd.xenesis.agents.events`, and `xd.xenesis.agents.submit` to inspect runtime diagnostics, verification reports, task inventory, registered Agent panes, quoted Agent pane status/events, or submit a quoted Agent pane message before mutating broader runtime state. Agent status/events require `args.agentId`; Agent submit requires `args.agentId` and `args.text`.',
    '- Use `xd.xenesis.profiles.list` to inspect installed and active Xenesis profiles before installing profiles, switching the active profile, updating channel settings, or sending profile channel test messages.',
    '- Use `xd.xenesis.runs.start` only when the user clearly asks to run a quoted prompt through the Xenesis runtime. Use `xd.xenesis.runs.cancel` only for explicit user requests to cancel the active Xenesis runtime request, and `xd.xenesis.sessions.reset` only for explicit user requests to reset the active Xenesis conversation/session.',
    '- Use external tool setup, connector, view, user-story, install-plan, MCP install draft, OAuth draft, and action-policy CR paths from the Capability Registry to inspect, open, or request review of internal Desk tool readiness surfaces. Tool install plans are review-only and do not execute installs, write MCP config, complete OAuth, store tokens, execute provider tools, mutate settings, or mutate external systems.',
    '- Use tool MCP install draft CR paths from the Capability Registry to inspect templates, focus owning cards, or record local Action Inbox review items without writing MCP config, running shell commands, completing OAuth, storing tokens, executing provider tools, or mutating settings.',
    '- Use tool OAuth draft CR paths from the Capability Registry to inspect Google OAuth app and token-store drafts, focus owning cards, or record local Action Inbox review items. Tool OAuth drafts are review-only and do not complete OAuth, store tokens, write MCP config, execute provider tools, send email, mutate documents, or mutate calendar events.',
    '- Use external tool action-policy CR paths from the Capability Registry to inspect review-only action catalogs, focus owning cards, or record local Action Inbox review items. Tool action catalogs are review-only and do not execute provider tools or mutate external systems.',
    '- Use provider profile-draft CR paths from the Capability Registry to inspect field drafts, focus provider draft cards, or record local Action Inbox review items. Provider profile drafts are review-only and do not mutate provider settings, store credentials, switch local CLI selection, or run provider prompts.',
    '- Use external messenger routing, safety, access-group, pairing, view, user-story, and profile-draft CR paths from the Capability Registry before testing or changing external messenger setup.',
    '- Channel profile drafts are review-only and do not mutate channel settings, update allowlists, write profiles, send test messages, start the gateway, store secrets, or bypass approvals.',
    '- Use `xd.testing.xenesisAgent.snapshot` and `xd.testing.xenesisAgent.submitPrompt` only for development smoke verification of the live Agent pane.',
    '- For dashboard or XCON/SKETCH artifact generation, Xenesis Agent should own generation through `/artifact`; Gowoori is the render target and GowooriChat is fallback only.',
    `- Connection Center CR paths discovered from Capability Registry: ${buildRegistryCapabilityPathSummary(XENESIS_CONNECTION_CENTER_HINT_PREFIXES)}.`,
    '- Common natural Desk requests map to Capability Registry paths before the LLM run when they are clear commands: settings `xd.panes.settings.open`, files `xd.files.listOpen`, `xd.files.open`, `xd.files.read`, explorer `xd.explorer.local.show`, `xd.explorer.local.navigate`, `xd.explorer.local.setFilter`, capture `xd.capture.activePane`, terminals `xd.terminals.list`, `xd.terminals.run`, `xd.terminals.runMany`, layout `xd.dock.window.arrange`, `xd.dock.pane.arrange`, `xd.dock.arrangeHorizontal`, `xd.dock.arrangeVertical`, `xd.dock.arrangeGrid`, `xd.dock.mergeGroup`, `xd.dock.mergeAll`, pane focus/close `xd.dock.focus`, `xd.dock.close`, sizing `xd.dock.sizes.current`, `xd.dock.sizes.set`, panes `xd.dock.panes.list`, tools `xd.tools.core.capabilityExplorer.open`, `xd.tools.core.networkMonitor.open`, and other `xd.tools.core.*.open` surfaces.',
    '- If the user asks in natural language for a supported local Desk operation, prefer the exact CR path rather than explaining how to do it manually.',
    '',
    'Open a right-side terminal example:',
    '```xenesis-desk-action',
    '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Open a terminal beside the current work."}',
    '```',
    '',
    'Prepare a Xenesis-led artifact workspace example:',
    '```xenesis-desk-action',
    '[',
    '  {"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true,"reason":"Use a large test viewport."},',
    '  {"path":"xd.views.open","args":{"kind":"gowoori","placement":"tab"},"approved":true,"reason":"Open Gowoori as the artifact surface."},',
    '  {"path":"xd.dock.artifactTarget.set","args":{"useActive":true},"approved":true,"reason":"Use the active Gowoori pane as the artifact target."},',
    '  {"path":"xd.views.open","args":{"kind":"xenesisAgent","placement":"right"},"approved":true,"reason":"Keep Xenesis Agent in the right dock as the control surface."}',
    ']',
    '```',
    '',
    'Open and focus a Xenesis Agent connection card example:',
    '```xenesis-desk-action',
    '{"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true,"reason":"Open Settings > Xenesis Agent > Connections and focus Notion."}',
    '```',
    '',
    'Approved multi-step workflow example:',
    '```xenesis-desk-action',
    '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model","mode":"hermes","section":"hermes-provider"}}]}}',
    '```',
    '',
  ];
  return [...lines, `Useful direct CR paths include ${buildDirectCrPathSummary(lines)}.`].join('\n');
}
