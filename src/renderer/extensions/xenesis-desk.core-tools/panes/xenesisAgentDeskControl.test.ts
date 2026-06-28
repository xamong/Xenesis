import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  isXenesisDeskActionRecordValue,
  isXenesisDeskActionValueType,
  isXenesisNaturalConnectionMessengerTarget,
  isXenesisNaturalConnectionToolTarget,
  isXenesisNaturalPlannedGoogleToolTarget,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_APPROVAL_STATE,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_EXECUTION_STATUS,
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT,
  XENESIS_DESK_ACTION_VALUE_TYPE_NAMES,
  XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX,
  XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
  XENESIS_NATURAL_ACTION_INTENT_RULES,
  XENESIS_NATURAL_ACTION_INTENT_WORDS,
  XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
  XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES,
  XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES,
  XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_READBACK_RULES,
  XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
  XENESIS_NATURAL_AGENT_SUBMIT_RULES,
  XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_ARRANGE_MODE_TARGETS,
  XENESIS_NATURAL_ARTIFACT_TARGET_RULES,
  XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
  XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
  XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_CONNECTION_CONTEXT_RULES,
  XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES,
  XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
  XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES,
  XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES,
  XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
  XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS,
  XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS,
  XENESIS_NATURAL_DESK_ACTION_ARGS,
  XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_DESK_CAPTURE_RULES,
  XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
  XENESIS_NATURAL_DESK_FILE_LIST_RULES,
  XENESIS_NATURAL_DESK_FILE_PATH_RULES,
  XENESIS_NATURAL_DESK_MISC_READ_RULES,
  XENESIS_NATURAL_DESK_PANE_OPEN_RULES,
  XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
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
  XENESIS_NATURAL_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES,
  XENESIS_NATURAL_EXPLICIT_OPEN_WORDS,
  XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
  XENESIS_NATURAL_EXPLORER_FILTER_RULES,
  XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES,
  XENESIS_NATURAL_EXPLORER_SIMPLE_RULES,
  XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES,
  XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES,
  XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS,
  XENESIS_NATURAL_FILE_CONTEXT_WORDS,
  XENESIS_NATURAL_GATEWAY_ACTION_RULES,
  XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS,
  XENESIS_NATURAL_GENERIC_OPEN_WORDS,
  XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS,
  XENESIS_NATURAL_GUIDE_OPEN_RULES,
  XENESIS_NATURAL_GUIDE_STATUS_RULES,
  XENESIS_NATURAL_GUIDE_TARGETS,
  XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
  XENESIS_NATURAL_LIST_OR_SHOW_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
  XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
  XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
  XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
  XENESIS_NATURAL_NUMERIC_LIMITS,
  XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
  XENESIS_NATURAL_ONBOARDING_OPEN_RULES,
  XENESIS_NATURAL_ONBOARDING_STATUS_RULES,
  XENESIS_NATURAL_ONBOARDING_STEP_TARGETS,
  XENESIS_NATURAL_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_OPEN_OR_SHOW_RULES,
  XENESIS_NATURAL_OPEN_OR_SHOW_WORDS,
  XENESIS_NATURAL_PANE_CONTEXT_WORDS,
  XENESIS_NATURAL_PLACEMENT_TARGETS,
  XENESIS_NATURAL_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
  XENESIS_NATURAL_PROFILE_INVENTORY_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_OPEN_RULES,
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES,
  XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS,
  XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_PROVIDER_STATUS_RULES,
  XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
  XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES,
  XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES,
  XENESIS_NATURAL_RUN_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
  XENESIS_NATURAL_RUN_START_RULES,
  XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS,
  XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_CONTROL_RULES,
  XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
  XENESIS_NATURAL_RUNTIME_INVENTORY_RULES,
  XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
  XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
  XENESIS_NATURAL_RUNTIME_SUPPORT_RULES,
  XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS,
  XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
  XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS,
  XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
  XENESIS_NATURAL_TASK_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
  XENESIS_NATURAL_TERMINAL_LIST_RULES,
  XENESIS_NATURAL_TERMINAL_MANY_RULES,
  XENESIS_NATURAL_TERMINAL_RUN_RULES,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES,
  XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES,
  XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
  XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES,
  XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES,
  XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS,
  XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
  XENESIS_NATURAL_WORKSPACE_SET_RULES,
  XENESIS_NATURAL_XENESIS_CONTEXT_WORDS,
} from '../../../../shared/xenesisNaturalLanguageCatalog';
import {
  approveXenesisDeskActions,
  buildXenesisDeskActionCompletedMessage,
  buildXenesisDeskActionPendingMessage,
  buildXenesisDeskControlPromptHint,
  parseXenesisDeskActionBlocks,
  pendingXenesisDeskActionsFromResults,
  planXenesisDeskNaturalLanguageActions,
  runXenesisDeskActions,
  shouldRunXenesisDeskActionsDirectly,
} from './xenesisAgentDeskControl';

test('xenesisAgentDeskControl keeps connection catalogs and CR path inventory out of the planner file', () => {
  const source = readFileSync(new URL('./xenesisAgentDeskControl.ts', import.meta.url), 'utf8');
  const catalogSource = readFileSync(
    new URL('../../../../shared/xenesisNaturalLanguageCatalog.ts', import.meta.url),
    'utf8',
  );
  let promptHintSource = '';
  try {
    promptHintSource = readFileSync(
      new URL('../../../../shared/xenesisDeskControlPromptHint.ts', import.meta.url),
      'utf8',
    );
  } catch {
    promptHintSource = '';
  }
  let naturalPlannerSource = '';
  try {
    naturalPlannerSource = readFileSync(
      new URL('../../../../shared/xenesisNaturalLanguagePlanner.ts', import.meta.url),
      'utf8',
    );
  } catch {
    naturalPlannerSource = '';
  }
  let actionRunnerSource = '';
  try {
    actionRunnerSource = readFileSync(
      new URL('../../../../shared/xenesisDeskActionRunner.ts', import.meta.url),
      'utf8',
    );
  } catch {
    actionRunnerSource = '';
  }

  for (const localFacadeImplementation of [
    'FromShared',
    'FromCatalog',
    'const DESK_ACTION_PROTOCOL_FORMAT',
    'export type XenesisDeskActionRequest =',
    'export type XenesisDeskActionCallOptions =',
    'export function planXenesisDeskNaturalLanguageActions',
    'export function parseXenesisDeskActionBlocks',
    'export async function runXenesisDeskActions',
    'export function isXenesisDeskActionApprovalRequiredResult',
    'export function buildXenesisDeskActionPendingMessage',
    'export function buildXenesisDeskControlPromptHint',
  ]) {
    assert.doesNotMatch(source, new RegExp(localFacadeImplementation));
  }
  for (const sharedFacadeModule of [
    'xenesisDeskActionRunner',
    'xenesisDeskControlPromptHint',
    'xenesisNaturalLanguageCatalog',
    'xenesisNaturalLanguagePlanner',
  ]) {
    assert.match(source, new RegExp(sharedFacadeModule));
  }

  assert.doesNotMatch(source, /const targets:\s*Array/);
  assert.doesNotMatch(source, /IMPLEMENTED_XENESIS_MESSENGER_IDS/);
  assert.doesNotMatch(source, /Useful direct CR paths include xd\.app\.status/);
  assert.doesNotMatch(source, /xd\.xenesis\.channels\.routing\.status, xd\.xenesis\.channels\.routing\.open/);
  assert.doesNotMatch(source, /Use `xd\.xenesis\.providers\.setup\.status`, `xd\.xenesis\.providers\.setup\.open`/);
  assert.doesNotMatch(source, /Use `xd\.xenesis\.tools\.setup\.status`, `xd\.xenesis\.tools\.setup\.open`/);
  assert.doesNotMatch(source, /Use `xd\.xenesis\.channels\.routing\.status`, `xd\.xenesis\.channels\.routing\.open`/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES/);
  assert.match(catalogSource, /XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GUIDE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS/);
  for (const localMatcherFunction of [
    'function hasAny',
    'function naturalRuleMatches',
    'function naturalContextRuleFromNaturalText',
    'function naturalContextMatches',
  ]) {
    assert.doesNotMatch(source, new RegExp(localMatcherFunction));
  }
  for (const sharedMatcherFunction of [
    'findXenesisNaturalContextRule',
    'matchesXenesisNaturalContextRule',
    'matchesXenesisNaturalContextRules',
  ]) {
    assert.match(naturalPlannerSource, new RegExp(sharedMatcherFunction));
    assert.match(catalogSource, new RegExp(`export function ${sharedMatcherFunction}`));
  }
  for (const localActionBuilderFunction of [
    'function naturalCatalogAction',
    'function naturalTemplateAction',
    'function xenesisConnectionTargetMatchesRule',
    'function xenesisConnectionTargetArgsForRule',
    'function xenesisProviderArgsForRule',
    'function xenesisOnboardingArgsForRule',
    'function xenesisConnectionAggregateRuleMatches',
  ]) {
    assert.doesNotMatch(source, new RegExp(localActionBuilderFunction));
  }
  for (const sharedActionBuilderFunction of [
    'buildXenesisNaturalCatalogAction',
    'buildXenesisNaturalTemplateAction',
    'findXenesisNaturalConnectionTargetRuleAction',
    'findXenesisNaturalProviderRuleAction',
    'findXenesisNaturalConnectionAggregateStatusAction',
    'findXenesisNaturalConnectionAggregateOpenAction',
  ]) {
    assert.match(catalogSource, new RegExp(`export function ${sharedActionBuilderFunction}`));
  }
  for (const localExtractionFunction of [
    'function normalizeNaturalLanguageText',
    'function detectPlacement',
    'function detectWindowSizerPreset',
    'function extractFirstInteger',
    'function detectDockSide',
    'function detectDockWindowState',
    'function detectArrangeMode',
    'function stripQuotedText',
    'function extractQuotedTexts',
    'function extractQuotedText',
    'function extractLocalPath',
    'function extractFilterQuery',
    'function extractTerminalCommand',
  ]) {
    assert.doesNotMatch(source, new RegExp(localExtractionFunction));
  }
  for (const sharedExtractionFunction of [
    'normalizeXenesisNaturalLanguageText',
    'detectXenesisNaturalPlacement',
    'detectXenesisNaturalWindowSizePreset',
    'extractXenesisNaturalFirstInteger',
    'extractXenesisNaturalDockSize',
    'extractXenesisNaturalTerminalCount',
    'detectXenesisNaturalDockSide',
    'detectXenesisNaturalDockWindowState',
    'detectXenesisNaturalArrangeMode',
    'stripXenesisNaturalQuotedText',
    'extractXenesisNaturalQuotedTexts',
    'extractXenesisNaturalQuotedText',
    'extractXenesisNaturalLocalPath',
    'extractXenesisNaturalFilterQuery',
    'extractXenesisNaturalTerminalCommand',
  ]) {
    assert.match(catalogSource, new RegExp(`export function ${sharedExtractionFunction}`));
  }
  assert.match(catalogSource, /export function xenesisNaturalTextHasAny/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'온보딩'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'external tool'/);
  assert.deepEqual(XENESIS_NATURAL_GUIDE_CONTEXT_WORDS, ['가이드', 'guide', 'guides', '문서', 'playbook', '플레이북']);
  assert.equal(XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS.includes('repo-local'), true);
  assert.equal(XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS.includes('setup checklist'), true);
  assert.equal(XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS.includes('diagnostics'), true);
  assert.equal(XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS.includes('외부 도구'), true);
  assert.equal(XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS.includes('channel catalogs'), true);
  assert.equal(XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS.includes('catalog'), true);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_DRAFT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_OAUTH_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_SETUP_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_SAFETY_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'connector'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'oauth'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'user story'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'라우팅'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'접근 그룹'/);
  assert.equal(XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS.includes('runbooks'), true);
  assert.equal(XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS.includes('setup 요청'), true);
  assert.equal(XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS.includes('drafts'), true);
  assert.equal(XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS.includes('커넥터'), true);
  assert.equal(XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS.includes('mcp install'), true);
  assert.equal(XENESIS_NATURAL_DRAFT_CONTEXT_WORDS.includes('설치 초안'), true);
  assert.equal(XENESIS_NATURAL_OAUTH_CONTEXT_WORDS.includes('토큰'), true);
  assert.equal(XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS.includes('surface'), true);
  assert.equal(XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS.includes('install plans'), true);
  assert.equal(XENESIS_NATURAL_SETUP_CONTEXT_WORDS.includes('configuration'), true);
  assert.equal(XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS.includes('permission'), true);
  assert.equal(XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS.includes('사용자 스토리'), true);
  assert.equal(XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS.includes('route'), true);
  assert.equal(XENESIS_NATURAL_SAFETY_CONTEXT_WORDS.includes('guardrail'), true);
  assert.equal(XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS.includes('allowlist'), true);
  assert.equal(XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS.includes('연동'), true);
  assert.equal(XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS.includes('provider profile'), true);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUNTIME_READBACK_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_XENESIS_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_AGENT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_REPORT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_TASK_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_LIST_OR_SHOW_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROFILE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUN_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUN_START_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CANCEL_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_SESSION_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_OPEN_OR_SHOW_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'local cli'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'gateway'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'xenesis'/);
  assert.doesNotMatch(source, /hasAny\(intentValue, \[\s*'xenesis'/);
  assert.equal(XENESIS_NATURAL_RUNTIME_READBACK_WORDS.includes('조회'), true);
  assert.equal(XENESIS_NATURAL_AGENT_CONTEXT_WORDS.includes('에이전트'), true);
  assert.equal(XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS.includes('이벤트'), true);
  assert.equal(XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS.includes('xenesis runtime status'), true);
  assert.equal(XENESIS_NATURAL_CANCEL_CONTEXT_WORDS.includes('cancel'), true);
  assert.equal(XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS.includes('대시보드'), true);
  assert.equal(XENESIS_NATURAL_LIST_OR_SHOW_WORDS.includes('show'), true);
  assert.equal(XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS.includes('로컬cli'), true);
  assert.equal(XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS.includes('scan'), true);
  assert.equal(XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS.includes('mcp 브리지'), true);
  assert.equal(XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS.includes('mcp 설정'), true);
  assert.equal(XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS.includes('게이트웨이'), true);
  assert.equal(XENESIS_NATURAL_OPEN_OR_SHOW_WORDS.includes('보여'), true);
  assert.equal(XENESIS_NATURAL_PROFILE_CONTEXT_WORDS.includes('profiles'), true);
  assert.equal(XENESIS_NATURAL_REPORT_CONTEXT_WORDS.includes('보고서'), true);
  assert.equal(XENESIS_NATURAL_RUN_CONTEXT_WORDS.includes('프롬프트'), true);
  assert.equal(XENESIS_NATURAL_RUN_START_CONTEXT_WORDS.includes('execute'), true);
  assert.equal(XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS.includes('런타임'), true);
  assert.equal(XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS.includes('operational diagnostics'), true);
  assert.equal(XENESIS_NATURAL_XENESIS_CONTEXT_WORDS.includes('제네시스'), true);
  assert.equal(XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS.includes('checklist'), true);
  assert.equal(XENESIS_NATURAL_SESSION_CONTEXT_WORDS.includes('conversation'), true);
  assert.equal(XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS.includes('clear'), true);
  assert.equal(XENESIS_NATURAL_TASK_CONTEXT_WORDS.includes('태스크'), true);
  assert.equal(XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS.includes('프롬프트'), true);
  assert.equal(XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS.includes('workspace'), true);
  assert.equal(XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS.includes('binding'), true);
  assert.doesNotMatch(source, /XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GENERIC_OPEN_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_FILE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_APP_STATUS_TARGET_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PANE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'캡쳐'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'탐색기'/);
  assert.doesNotMatch(source, /hasAny\(value, \[\s*'터미널'/);
  assert.equal(XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS.includes('settings'), true);
  assert.equal(XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS.includes('diagnostics'), true);
  assert.equal(XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS.includes('screenshot'), true);
  assert.equal(XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS.includes('리스트'), true);
  assert.equal(XENESIS_NATURAL_GENERIC_OPEN_WORDS.includes('open'), true);
  assert.equal(XENESIS_NATURAL_FILE_CONTEXT_WORDS.includes('문서'), true);
  assert.equal(XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS.includes('파일 트리'), true);
  assert.equal(XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS.includes('shell'), true);
  assert.equal(XENESIS_NATURAL_PANE_CONTEXT_WORDS.includes('pane'), true);
  assert.equal(XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS.includes('close'), true);
  assert.doesNotMatch(source, /listDeskBridgeCapabilities/);
  assert.match(promptHintSource, /listDeskBridgeCapabilities/);
  for (const localPromptHintFunction of [
    'function isCapabilityPathUnderPrefix',
    'function buildRegistryCapabilityPathSummary',
    'function buildDirectCrPathSummary',
  ]) {
    assert.doesNotMatch(source, new RegExp(localPromptHintFunction));
  }
  for (const sharedPromptHintFunction of [
    'isXenesisDeskCapabilityPathUnderPrefix',
    'buildXenesisDeskRegistryCapabilityPathSummary',
    'buildXenesisDeskDirectCrPathSummary',
    'buildXenesisDeskControlPromptHint',
  ]) {
    assert.match(promptHintSource, new RegExp(`export function ${sharedPromptHintFunction}`));
  }
  assert.doesNotMatch(source, /XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES/);
  assert.doesNotMatch(source, /XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES/);
  assert.doesNotMatch(source, /XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES/);
  assert.match(promptHintSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES/);
  assert.match(promptHintSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES/);
  assert.match(promptHintSource, /XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES/);
  assert.doesNotMatch(source, /const XENESIS_CONNECTION_CENTER_HINT_PREFIXES = \[/);
  assert.doesNotMatch(source, /Native Xenesis Desk Capability Registry control:/);
  assert.doesNotMatch(source, /Common natural Desk requests map to Capability Registry paths/);
  assert.doesNotMatch(source, /Open a right-side terminal example:/);
  assert.equal(
    XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES[0],
    'Native Xenesis Desk Capability Registry control:',
  );
  assert.equal(
    XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX,
    '- Connection Center CR paths discovered from Capability Registry: ',
  );
  assert.equal(XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES.includes('xd.xenesis.connections'), true);
  assert.equal(
    XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES.includes('Open a right-side terminal example:'),
    true,
  );
  for (const localNaturalPlannerFunction of [
    'function hasExplicitOpenIntent',
    'function hasActionIntent',
    'function naturalCatalogRuleFromNaturalText',
    'function naturalCatalogRuleActionFromNaturalText',
    'function naturalCatalogRulePlanFromNaturalText',
    'function naturalPlan',
    'function emptyNaturalPlan',
    'function toolOpenActionFromNaturalText',
    'function viewKindFromNaturalText',
    'function xenesisConnectionTargetFromNaturalText',
    'function xenesisConnectionActionFromNaturalText',
    'function xenesisConnectionReadbackActionFromNaturalText',
    'function xenesisConnectionReviewRequestActionFromNaturalText',
    'function xenesisRuntimeInventoryActionFromNaturalText',
    'function xenesisWorkspaceSetActionFromNaturalText',
  ]) {
    assert.doesNotMatch(source, new RegExp(localNaturalPlannerFunction));
    assert.match(naturalPlannerSource, new RegExp(localNaturalPlannerFunction));
  }
  assert.match(naturalPlannerSource, /export function planXenesisDeskNaturalLanguageActions/);
  for (const sharedPlannerOwnedRule of [
    'XENESIS_NATURAL_DESK_PANE_OPEN_RULES',
    'XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES',
    'XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES',
    'XENESIS_NATURAL_RUNTIME_CONTROL_RULES',
    'XENESIS_NATURAL_WORKSPACE_SET_RULES',
    'XENESIS_NATURAL_TERMINAL_RUN_RULES',
    'XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES',
  ]) {
    assert.doesNotMatch(source, new RegExp(sharedPlannerOwnedRule));
    assert.match(naturalPlannerSource, new RegExp(sharedPlannerOwnedRule));
  }
  assert.doesNotMatch(source, /XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PLAN_VISIBLE_TEXT/);
  assert.doesNotMatch(source, /naturalPlan\((?:'|`)/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_EXTRACTION_PATTERNS/);
  assert.match(catalogSource, /XENESIS_NATURAL_EXTRACTION_PATTERNS/);
  assert.doesNotMatch(source, /match\(\/\\d\+\//);
  assert.doesNotMatch(source, /const quotedPattern =/);
  assert.doesNotMatch(source, /\[a-z\]:\\\\/);
  assert.doesNotMatch(source, /탐색기\|파일\|폴더\|필터/);
  assert.doesNotMatch(source, /terminal\\s\+run/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TEXT_DEFAULTS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_NUMERIC_LIMITS/);
  assert.match(catalogSource, /XENESIS_NATURAL_NUMERIC_LIMITS/);
  assert.doesNotMatch(source, /normalize\('NFKC'\)/);
  assert.doesNotMatch(source, /replace\(EXTRACTION_PATTERNS\.normalizedWhitespace, ' '\)/);
  assert.doesNotMatch(source, /split\(' '\)/);
  assert.doesNotMatch(source, /extractFirstInteger\(value, 120, 4096\)/);
  assert.doesNotMatch(source, /extractFirstInteger\(value, 1, 50\)/);
  assert.doesNotMatch(source, /(?:return|=|\|\||:|,\s*)\s*''/);
  assert.equal(XENESIS_NATURAL_TEXT_DEFAULTS.empty, '');
  assert.equal(XENESIS_NATURAL_TEXT_DEFAULTS.unicodeNormalizationForm, 'NFKC');
  assert.equal(XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator, ' ');
  assert.equal(XENESIS_NATURAL_NUMERIC_LIMITS.dockSize.max, 4096);
  assert.equal(XENESIS_NATURAL_NUMERIC_LIMITS.terminalCount.max, 50);
  assert.doesNotMatch(source, /type XenesisDeskPlacement = 'tab'/);
  assert.doesNotMatch(source, /type XenesisDeskDockSide = 'left'/);
  assert.doesNotMatch(source, /type XenesisDeskWindowState = 'top'/);
  assert.doesNotMatch(source, /type XenesisDeskArrangeMode = 'row'/);
  assert.doesNotMatch(source, /\$\{prefix\}\./);
  assert.doesNotMatch(source, /\)\}\./);
  assert.doesNotMatch(source, /XenesisNaturalPlacementId as XenesisDeskPlacement/);
  assert.doesNotMatch(source, /XenesisNaturalDockSideId as XenesisDeskDockSide/);
  assert.doesNotMatch(source, /XenesisNaturalDockWindowStateId as XenesisDeskWindowState/);
  assert.doesNotMatch(source, /XenesisNaturalArrangeModeId as XenesisDeskArrangeMode/);
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.capabilityPathSeparator, '.');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.sentenceTerminator, '.');
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_PROTOCOL_PATTERNS/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_PROTOCOL_TEXT/);
  assert.match(promptHintSource, /XENESIS_DESK_ACTION_PROTOCOL_PATTERNS/);
  assert.match(promptHintSource, /XENESIS_DESK_ACTION_PROTOCOL_TEXT/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_PROTOCOL_FORMAT/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_PROTOCOL_FORMAT/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT/);
  assert.doesNotMatch(source, /const DESK_ACTION_FENCE_PATTERN/);
  assert.doesNotMatch(source, /Desk action approval required/);
  assert.doesNotMatch(source, /Useful direct CR paths include/);
  assert.doesNotMatch(source, /requires approval\|approval required/);
  assert.doesNotMatch(source, /'xd\.files\.listOpen'/);
  assert.doesNotMatch(source, /path\.startsWith\('xd\.'/);
  assert.doesNotMatch(source, /'openFiles'/);
  assert.doesNotMatch(source, /'1 file'/);
  assert.doesNotMatch(source, /first: \$\{title\}/);
  assert.doesNotMatch(source, /'workflow'/);
  assert.doesNotMatch(source, /\$\{completed\} completed/);
  assert.doesNotMatch(source, /record\.renderer/);
  assert.doesNotMatch(source, /record\.message/);
  assert.doesNotMatch(source, /renderer\.message/);
  assert.doesNotMatch(source, /compact === '\{\}'/);
  assert.doesNotMatch(source, /compact === '\[\]'/);
  for (const localResultMessageFunction of [
    'function describeDeskAction',
    'function asRecord',
    'function compactJson',
    'function basename',
    'function arrayFromRecord',
    'function stringFromRecord',
    'function numberFromRecord',
    'function basenameFromRecord',
    'function firstReadableTitle',
    'function summarizeFileList',
    'function summarizeCaptureResult',
    'function summarizeBoundsResult',
    'function summarizeWorkflowResult',
    'function summarizeDeskActionResult',
  ]) {
    assert.doesNotMatch(source, new RegExp(localResultMessageFunction));
  }
  for (const sharedResultMessageFunction of [
    'asXenesisDeskActionRecord',
    'compactXenesisDeskActionJson',
    'basenameXenesisDeskActionValue',
    'arrayFromXenesisDeskActionRecord',
    'stringFromXenesisDeskActionRecord',
    'numberFromXenesisDeskActionRecord',
    'basenameFromXenesisDeskActionRecord',
    'firstReadableXenesisDeskActionTitle',
    'summarizeXenesisDeskActionFileList',
    'summarizeXenesisDeskActionCaptureResult',
    'summarizeXenesisDeskActionBoundsResult',
    'summarizeXenesisDeskActionWorkflowResult',
    'summarizeXenesisDeskActionResult',
    'buildXenesisDeskActionPendingMessage',
    'buildXenesisDeskActionCompletedMessage',
    'summarizeXenesisDeskActionExecution',
  ]) {
    assert.match(catalogSource, new RegExp(`export function ${sharedResultMessageFunction}`));
  }
  assert.doesNotMatch(source, /record\.path/);
  assert.doesNotMatch(source, /record\.id/);
  assert.doesNotMatch(source, /record\.reason/);
  assert.doesNotMatch(source, /record\.approved/);
  for (const localParserFunction of [
    'function normalizeDeskActionRecord',
    'function actionRecordsFromJson',
    'function normalizeVisibleText',
  ]) {
    assert.doesNotMatch(source, new RegExp(localParserFunction));
  }
  for (const sharedParserFunction of [
    'normalizeXenesisDeskActionRecord',
    'xenesisDeskActionRecordsFromJson',
    'normalizeXenesisDeskActionVisibleText',
    'parseXenesisDeskActionBlocks',
    'shouldRunXenesisDeskActionsDirectly',
  ]) {
    assert.match(catalogSource, new RegExp(`export function ${sharedParserFunction}`));
  }
  assert.doesNotMatch(source, /Object\.hasOwn\(record, 'args'\)/);
  assert.doesNotMatch(source, /Record<string, unknown>\)\.actions/);
  assert.doesNotMatch(source, /desk-action-\$\{index \+ 1\}/);
  assert.doesNotMatch(source, /maxLength = 180/);
  assert.doesNotMatch(source, /const reason = action\.reason \? ` - \$\{action\.reason\}` : ''/);
  assert.doesNotMatch(source, /summary \? `- \$\{result\.path\}: \$\{summary\}` : `- \$\{result\.path\}`/);
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.path, 'path');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.actions, 'actions');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.defaultActionId(0), 'desk-action-1');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.actionBullet('xd.test.path', 'because'), '- xd.test.path - because');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.resultBullet('xd.test.path', 'ok'), '- xd.test.path: ok');
  for (const localRunnerDetail of [
    'const results: XenesisDeskActionExecutionResult\\[\\] = \\[\\]',
    'const reportActivity = \\(activity: XenesisDeskActionActivity\\)',
    'Activity reporting is observational',
    'await executor\\(action\\.path, action\\.args, \\{ approved: action\\.approved \\}\\)',
    'DESK_ACTION_ACTIVITY_PHASES\\.approvalRequired',
    'DESK_ACTION_EXECUTION_STATUS\\.isOk',
    'callResult\\[DESK_ACTION_CALL_RESULT_KEYS\\.result\\]',
    'error instanceof Error \\? error\\.message : String\\(error\\)',
  ]) {
    assert.doesNotMatch(source, new RegExp(localRunnerDetail));
  }
  for (const sharedRunnerExport of [
    'export interface XenesisDeskActionCallOptions',
    'export interface XenesisDeskActionCallResult',
    'export interface XenesisDeskActionExecutionResult',
    'export type XenesisDeskActionExecutor',
    'export interface XenesisDeskActionActivity',
    'export interface XenesisDeskActionRunOptions',
    'export async function runXenesisDeskActions',
  ]) {
    assert.match(actionRunnerSource, new RegExp(sharedRunnerExport));
  }
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_ACTIVITY_PHASES/);
  assert.match(actionRunnerSource, /XENESIS_DESK_ACTION_ACTIVITY_PHASES/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_APPROVAL_STATE/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_APPROVAL_STATE/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_EXECUTION_STATUS/);
  assert.match(actionRunnerSource, /XENESIS_DESK_ACTION_EXECUTION_STATUS/);
  assert.doesNotMatch(source, /phase: 'start'/);
  assert.doesNotMatch(source, /phase: 'failure'/);
  assert.doesNotMatch(source, /'approval-required'/);
  assert.doesNotMatch(source, /approved: false/);
  assert.doesNotMatch(source, /approved: true/);
  assert.doesNotMatch(source, /ok: false/);
  assert.doesNotMatch(source, /ok: callResult\.ok !== false/);
  assert.equal(XENESIS_DESK_ACTION_ACTIVITY_PHASES.approvalRequired, 'approval-required');
  assert.equal(XENESIS_DESK_ACTION_APPROVAL_STATE.pending, false);
  assert.equal(XENESIS_DESK_ACTION_APPROVAL_STATE.approved, true);
  assert.equal(XENESIS_DESK_ACTION_EXECUTION_STATUS.failed, false);
  assert.equal(XENESIS_DESK_ACTION_EXECUTION_STATUS.isOk(undefined), true);
  assert.equal(XENESIS_DESK_ACTION_EXECUTION_STATUS.isOk(false), false);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_CALL_RESULT_KEYS/);
  assert.match(actionRunnerSource, /XENESIS_DESK_ACTION_CALL_RESULT_KEYS/);
  assert.doesNotMatch(source, /XENESIS_DESK_ACTION_VALUE_TYPE_NAMES/);
  assert.doesNotMatch(source, /isXenesisDeskActionRecordValue/);
  assert.doesNotMatch(source, /isXenesisDeskActionValueType/);
  assert.match(catalogSource, /XENESIS_DESK_ACTION_VALUE_TYPE_NAMES/);
  assert.match(catalogSource, /isXenesisDeskActionRecordValue/);
  assert.match(catalogSource, /isXenesisDeskActionValueType/);
  assert.doesNotMatch(source, /typeof [^;\n]+ === 'object'/);
  assert.doesNotMatch(source, /typeof [^;\n]+ === 'string'/);
  assert.doesNotMatch(source, /typeof [^;\n]+ === 'number'/);
  assert.doesNotMatch(source, /typeof [^;\n]+ !== 'object'/);
  assert.doesNotMatch(source, /callResult\.(ok|result|error|approvalRequired|permission|approval|source)/);
  assert.doesNotMatch(source, /value\.result/);
  assert.doesNotMatch(source, /result\.approvalRequired/);
  for (const localApprovalFunction of ['function resultRecord']) {
    assert.doesNotMatch(source, new RegExp(localApprovalFunction));
  }
  for (const sharedApprovalFunction of [
    'xenesisDeskActionResultRecord',
    'isXenesisDeskActionApprovalRequiredResult',
    'pendingXenesisDeskActionsFromResults',
    'approveXenesisDeskActions',
  ]) {
    assert.match(catalogSource, new RegExp(`export function ${sharedApprovalFunction}`));
  }
  assert.doesNotMatch(source, /DESK_ACTION_PROTOCOL_PATTERNS\.approvalRequiredError\.test/);
  assert.doesNotMatch(source, /approved: DESK_ACTION_APPROVAL_STATE\.pending/);
  assert.doesNotMatch(source, /approved: DESK_ACTION_APPROVAL_STATE\.approved/);
  assert.equal(XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.object, 'object');
  assert.equal(XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string, 'string');
  assert.equal(XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.number, 'number');
  assert.equal(isXenesisDeskActionRecordValue({ result: true }), true);
  assert.equal(isXenesisDeskActionRecordValue(['result']), false);
  assert.equal(isXenesisDeskActionValueType('result', XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string), true);
  assert.equal(isXenesisDeskActionValueType(1, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.number), true);
  assert.equal(XENESIS_DESK_ACTION_CALL_RESULT_KEYS.approvalRequired, 'approvalRequired');
  assert.equal(XENESIS_DESK_ACTION_CALL_RESULT_KEYS.source, 'source');
  assert.deepEqual(XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.fileList, ['openFiles', 'files', 'items', 'entries']);
  assert.equal(XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.fileList(1, 'README.md'), '1 file, first: README.md');
  assert.equal(XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(2, 'passed'), '2 passed');
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_INTENT_PATTERNS/);
  assert.equal(XENESIS_NATURAL_ACTION_INTENT_RULES[0]?.contextWords.includes('authorize'), true);
  assert.equal(XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES[0]?.contextWords.includes('포커스'), true);
  assert.equal(XENESIS_NATURAL_OPEN_COMMAND_RULES[0]?.contextWords.includes('open'), true);
  assert.equal(XENESIS_NATURAL_OPEN_OR_SHOW_RULES[0]?.contextWords.includes('보여'), true);
  assert.equal(XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES[0]?.contextWords.includes('start'), true);
  assert.equal(XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES[0]?.contextWords.includes('repo-local'), true);
  assert.equal(XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES[0]?.contextWords.includes('diagnostics'), true);
  assert.equal(XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES[0]?.contextWords.includes('외부 도구'), true);
  assert.equal(
    XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES[0]?.contextWords.includes('channel catalogs'),
    true,
  );
  assert.equal(XENESIS_NATURAL_CONNECTION_CONTEXT_RULES[0]?.contextWords.includes('connection center'), true);
  assert.equal(XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES[0]?.contextWords.includes('provider profile'), true);
  assert.deepEqual(
    XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES.map((rule) => ({
      requiredGroups: rule.requiredContextWordGroups?.length ?? 0,
      blocked: rule.blockedContextWords?.includes('status') === true,
    })),
    [
      { requiredGroups: 1, blocked: true },
      { requiredGroups: 1, blocked: true },
      { requiredGroups: 1, blocked: true },
      { requiredGroups: 1, blocked: true },
      { requiredGroups: 1, blocked: true },
      { requiredGroups: 1, blocked: true },
    ],
  );
  assert.deepEqual(Object.keys(XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES), [
    'guideCatalog',
    'diagnosticsCatalog',
    'setupRequestCatalog',
    'onboarding',
    'guideContext',
    'connectionContext',
    'connectionCenterOpen',
  ]);
  assert.equal(XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES.onboarding[0]?.contextWords.includes('온보딩'), true);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ACTION_INTENT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_OPEN_COMMAND_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_OPEN_OR_SHOW_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES/);
  for (const movedContextWordImport of [
    'XENESIS_NATURAL_ACTION_INTENT_WORDS',
    'XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS',
    'XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS',
    'XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS',
    'XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS',
    'XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS',
    'XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS',
    'XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS',
    'XENESIS_NATURAL_EXPLICIT_OPEN_WORDS',
    'XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS',
    'XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS',
    'XENESIS_NATURAL_GENERIC_OPEN_WORDS',
    'XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS',
    'XENESIS_NATURAL_OPEN_COMMAND_WORDS',
    'XENESIS_NATURAL_OPEN_OR_SHOW_WORDS',
    'XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS',
    'XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS',
    'XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS',
    'XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS',
    'XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS',
    'XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS',
    'XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS',
  ]) {
    assert.doesNotMatch(source, new RegExp(movedContextWordImport));
  }
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_AUTO_TARGET/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CORE_TOOL_OPEN_REASON/);
  assert.doesNotMatch(source, /\/\\b\(open\|focus\)\\b\//);
  assert.doesNotMatch(source, /id: 'auto'/);
  assert.doesNotMatch(source, /Open \$\{definition\.reasonName\} from natural language request/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_ACTION_ARGS/);
  assert.doesNotMatch(source, /placement: placement \|\| 'tab'/);
  assert.doesNotMatch(source, /placement \|\| 'tab'/);
  assert.doesNotMatch(source, /\{ useActive: true \}/);
  assert.doesNotMatch(source, /filePath \? \{ filePath \} : \{\}/);
  assert.doesNotMatch(source, /\{ presetId \}/);
  assert.doesNotMatch(source, /windowState: detectDockWindowState\(value\) \|\| 'document'/);
  assert.doesNotMatch(source, /command: command \|\| XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND/);
  assert.equal(XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement, 'tab');
  assert.equal(XENESIS_NATURAL_DESK_ACTION_ARGS.useActive().useActive, true);
  assert.deepEqual(XENESIS_NATURAL_DESK_ACTION_ARGS.optionalFilePath('README.md'), { filePath: 'README.md' });
  assert.doesNotMatch(source, /ensureVisible: true/);
  assert.doesNotMatch(source, /naturalTemplateAction\([\s\S]{0,200}\{\s*id: target\.id/);
  assert.doesNotMatch(source, /naturalTemplateAction\([\s\S]{0,200}\{\s*id: guide\.id/);
  assert.doesNotMatch(source, /naturalTemplateAction\([\s\S]{0,200}\{\s*id: step\.id/);
  assert.doesNotMatch(source, /naturalTemplateAction\([\s\S]{0,200}\{\s*tool: target\.id/);
  assert.doesNotMatch(source, /naturalTemplateAction\([\s\S]{0,200}\{\s*channel: target\.id/);
  assert.doesNotMatch(source, /\{ provider: provider\.id \}/);
  assert.doesNotMatch(source, /\{ agentId \}/);
  assert.doesNotMatch(source, /\{ agentId, text \}/);
  assert.doesNotMatch(source, /\{ prompt \}/);
  assert.doesNotMatch(source, /workspaceSet, \{ path \}/);
  assert.doesNotMatch(source, /naturalCatalogAction\([^)]*, \{\}\)/);
  assert.deepEqual(XENESIS_NATURAL_DESK_ACTION_ARGS.empty(), {});
  assert.equal(XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible().ensureVisible, true);
  assert.deepEqual(XENESIS_NATURAL_DESK_ACTION_ARGS.targetIdVisible('telegram'), {
    id: 'telegram',
    ensureVisible: true,
  });
  assert.deepEqual(XENESIS_NATURAL_DESK_ACTION_ARGS.channel('telegram'), { channel: 'telegram' });
  assert.doesNotMatch(source, /isXenesisNaturalConnectionToolTarget/);
  assert.doesNotMatch(source, /isXenesisNaturalConnectionMessengerTarget/);
  assert.doesNotMatch(source, /isXenesisNaturalPlannedGoogleToolTarget/);
  assert.match(catalogSource, /export function isXenesisNaturalConnectionToolTarget/);
  assert.match(catalogSource, /export function isXenesisNaturalConnectionMessengerTarget/);
  assert.match(catalogSource, /export function isXenesisNaturalPlannedGoogleToolTarget/);
  assert.doesNotMatch(source, /target\.kind === 'tool'/);
  assert.doesNotMatch(source, /target\.kind === 'messenger'/);
  assert.doesNotMatch(source, /google-calendar/);
  assert.doesNotMatch(source, /google-workspace/);
  assert.equal(isXenesisNaturalConnectionToolTarget({ kind: 'tool' }), true);
  assert.equal(isXenesisNaturalConnectionMessengerTarget({ kind: 'messenger' }), true);
  assert.equal(isXenesisNaturalPlannedGoogleToolTarget({ id: 'google-calendar', kind: 'tool' }), true);
  assert.doesNotMatch(source, /function naturalCoreToolOpenAction/);
  assert.doesNotMatch(source, /function naturalViewOpenAction/);
  assert.match(naturalPlannerSource, /buildXenesisNaturalCoreToolOpenAction/);
  assert.match(naturalPlannerSource, /buildXenesisNaturalViewOpenAction/);
  assert.equal([...source.matchAll(/return naturalAction\(/g)].length, 0);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-settings-open'/);
  assert.doesNotMatch(source, /naturalAction\('natural-capture-list', 'xd\.capture\.list'/);
  assert.doesNotMatch(source, /let path = 'xd\.dock\.close';/);
  assert.doesNotMatch(source, /'xd\.explorer\.local\.show'/);
  assert.equal(XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.settingsOpen.path, 'xd.panes.settings.open');
  assert.equal(XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.captureList.id, 'natural-capture-list');
  assert.equal(XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseRight.path, 'xd.dock.closeRight');
  assert.equal(
    XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerShow.reason,
    'Show explorer from natural language request.',
  );
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_PANE_OPEN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_CAPTURE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_FILE_LIST_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_FILE_PATH_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DESK_MISC_READ_RULES/);
  assert.doesNotMatch(
    source,
    /DESK_ACTIONS\.(settingsOpen|diagnosticsOpen|capabilityExplorerOpen|captureList|captureActivePane|filesListOpen|fileOpen|fileRead|favoritesShow|appStatus)\b/,
  );
  assert.deepEqual(
    XENESIS_NATURAL_DESK_PANE_OPEN_RULES.map((rule) => rule.action.path),
    ['xd.panes.settings.open', 'xd.panes.diagnostics.open', 'xd.tools.core.capabilityExplorer.open'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DESK_CAPTURE_RULES.map((rule) => rule.action.path),
    ['xd.capture.list', 'xd.capture.activePane'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DESK_FILE_LIST_RULES.map((rule) => rule.action.path),
    ['xd.files.listOpen'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DESK_FILE_PATH_RULES.map((rule) => rule.action.path),
    ['xd.files.open', 'xd.files.read'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DESK_MISC_READ_RULES.map((rule) => rule.action.path),
    ['xd.favorites.showTab', 'xd.app.status'],
  );
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_SIZE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXPLORER_SIMPLE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXPLORER_FILTER_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TERMINAL_LIST_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TERMINAL_MANY_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TERMINAL_RUN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_PANE_MERGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_DOCK_PANES_LIST_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ARTIFACT_TARGET_RULES/);
  assert.doesNotMatch(source, /const DESK_ACTIONS =/);
  assert.doesNotMatch(source, /DESK_ACTIONS\./);
  assert.deepEqual(
    XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES.map((rule) => rule.action.path),
    ['xd.dock.focus'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES.map((rule) => rule.action.path),
    ['xd.dock.closeRight', 'xd.dock.closeOthers', 'xd.dock.closeAll', 'xd.dock.close'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_EXPLORER_SIMPLE_RULES.map((rule) => rule.action.path),
    [
      'xd.explorer.local.hide',
      'xd.explorer.local.toggle',
      'xd.explorer.local.refresh',
      'xd.explorer.local.goUp',
      'xd.explorer.local.show',
    ],
  );
  assert.deepEqual(
    [
      ...XENESIS_NATURAL_TERMINAL_LIST_RULES,
      ...XENESIS_NATURAL_TERMINAL_MANY_RULES,
      ...XENESIS_NATURAL_TERMINAL_RUN_RULES,
    ].map((rule) => rule.action.path),
    ['xd.terminals.list', 'xd.terminals.runMany', 'xd.terminals.run'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES.map((rule) => rule.action.path),
    ['xd.dock.arrangeGrid', 'xd.dock.arrangeHorizontal', 'xd.dock.arrangeVertical'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES.map((rule) => rule.action.path),
    ['xd.dock.mergeAll', 'xd.dock.mergeGroup'],
  );
  assert.equal(XENESIS_NATURAL_DOCK_SIZE_RULES[0]?.action.path, 'xd.dock.sizes.set');
  assert.equal(XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES[0]?.action.path, 'xd.window.sizer.applyPreset');
  assert.equal(XENESIS_NATURAL_EXPLORER_FILTER_RULES[0]?.action.path, 'xd.explorer.local.setFilter');
  assert.equal(XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES[0]?.action.path, 'xd.explorer.local.navigate');
  assert.equal(XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES[0]?.action.path, 'xd.dock.window.arrange');
  assert.equal(XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES[0]?.action.path, 'xd.dock.pane.arrange');
  assert.equal(XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES[0]?.action.path, 'xd.dock.window.merge');
  assert.equal(XENESIS_NATURAL_DOCK_PANE_MERGE_RULES[0]?.action.path, 'xd.dock.pane.merge');
  assert.equal(XENESIS_NATURAL_DOCK_PANES_LIST_RULES[0]?.action.path, 'xd.dock.panes.list');
  assert.equal(XENESIS_NATURAL_ARTIFACT_TARGET_RULES[0]?.action.path, 'xd.dock.artifactTarget.set');
  assert.doesNotMatch(source, /XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_AGENT_READBACK_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_AGENT_SUBMIT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_RUNTIME_SUPPORT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_GATEWAY_ACTION_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_RUNTIME_INVENTORY_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROFILE_INVENTORY_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_RUNTIME_CONTROL_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_RUN_START_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_WORKSPACE_SET_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-local-cli-scan'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-status'/);
  assert.doesNotMatch(source, /'xd\.xenesis\.runs\.start'/);
  assert.doesNotMatch(source, /const RUNTIME_ACTIONS =/);
  assert.doesNotMatch(source, /RUNTIME_ACTIONS\./);
  assert.deepEqual(
    XENESIS_NATURAL_AGENT_READBACK_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.agents.events', 'xd.xenesis.agents.status'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_AGENT_SUBMIT_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.agents.submit'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_RUNTIME_SUPPORT_RULES.map((rule) => rule.action.path),
    ['xd.localCli.scan', 'xd.mcp.bridge.status', 'xd.mcp.settings.status', 'xd.mcp.actionInbox.list'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_GATEWAY_ACTION_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.gateway.openDashboard', 'xd.xenesis.gateway.status'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_RUNTIME_INVENTORY_RULES.map((rule) => ({
      path: rule.action.path,
      blockedContextWords: 'blockedContextWords' in rule ? rule.blockedContextWords.length : 0,
    })),
    [
      { path: 'xd.xenesis.status', blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS.length },
      { path: 'xd.xenesis.status', blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS.length },
      { path: 'xd.xenesis.reports.list', blockedContextWords: 0 },
      { path: 'xd.xenesis.tasks.list', blockedContextWords: 0 },
      { path: 'xd.xenesis.agents.list', blockedContextWords: 0 },
      { path: 'xd.xenesis.diagnostics', blockedContextWords: 0 },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_PROFILE_INVENTORY_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.profiles.list'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_RUNTIME_CONTROL_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.runs.cancel', 'xd.xenesis.sessions.reset'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_RUN_START_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.runs.start'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_WORKSPACE_SET_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.workspace.set'],
  );
  assert.equal(XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS.actionInboxList, 'xd.mcp.actionInbox.list');
  assert.equal(XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runsStart.path, 'xd.xenesis.runs.start');
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_GUIDE_OPEN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_GUIDE_STATUS_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ONBOARDING_OPEN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ONBOARDING_STATUS_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /const GUIDE_ACTIONS =/);
  assert.doesNotMatch(source, /GUIDE_ACTIONS\./);
  assert.doesNotMatch(source, /const ONBOARDING_ACTIONS =/);
  assert.doesNotMatch(source, /ONBOARDING_ACTIONS\./);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-guide-open-\$\{guide\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-onboarding-center-open'/);
  assert.equal(XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.open.path, 'xd.xenesis.guides.open');
  assert.equal(
    XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.status.idFor('provider', 'Provider'),
    'natural-xenesis-guide-status-provider',
  );
  assert.equal(XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.centerOpen.id, 'natural-xenesis-onboarding-center-open');
  assert.equal(XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.stepOpen.path, 'xd.xenesis.onboarding.open');
  assert.deepEqual(
    XENESIS_NATURAL_GUIDE_OPEN_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.guides.open'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_GUIDE_STATUS_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.guides.status'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_ONBOARDING_OPEN_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.onboarding.open', 'xd.xenesis.onboarding.open'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_ONBOARDING_STATUS_RULES.map((rule) => rule.action.path),
    ['xd.xenesis.onboarding.status'],
  );
  assert.doesNotMatch(source, /XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-tools-connectors-status'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-messengers-routing-status'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-providers-setup-status'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-connections-status'/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_STATUS_ACTIONS\.guides/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_STATUS_ACTIONS\.diagnostics/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_STATUS_ACTIONS\.setupRequests/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_STATUS_ACTIONS\.onboarding/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_STATUS_ACTIONS\.connections/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_STATUS_ACTIONS\.routing/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_STATUS_ACTIONS\.views/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_STATUS_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_STATUS_ACTIONS\.setup/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.routing/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.safety/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.accessGroups/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.pairing/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.userStories/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_STATUS_ACTIONS\.views/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.connectors/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.mcpInstallDrafts/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.oauthDrafts/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.views/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.installPlans/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.setup/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.actions/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_STATUS_ACTIONS\.userStories/);
  assert.deepEqual(
    XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES.map((rule) => ({
      path: rule.action.path,
      requiredGroups: 'requiredContextWordGroups' in rule ? rule.requiredContextWordGroups.length : 0,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.tools.connectors.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.mcpInstallDrafts.status', requiredGroups: 1, fallback: false },
      { path: 'xd.xenesis.tools.oauthDrafts.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.views.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.installPlans.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.setup.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.actions.status', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.userStories.status', requiredGroups: 0, fallback: false },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.channels.profileDrafts.status', fallback: false },
      { path: 'xd.xenesis.channels.routing.status', fallback: false },
      { path: 'xd.xenesis.channels.safety.status', fallback: false },
      { path: 'xd.xenesis.channels.accessGroups.status', fallback: false },
      { path: 'xd.xenesis.channels.pairing.status', fallback: false },
      { path: 'xd.xenesis.channels.userStories.status', fallback: false },
      { path: 'xd.xenesis.messengers.views.status', fallback: false },
    ],
  );
  assert.equal(
    XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setup.path,
    'xd.xenesis.providers.setup.status',
  );
  assert.deepEqual(
    XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.providers.routing.status', fallback: false },
      { path: 'xd.xenesis.providers.views.status', fallback: false },
      { path: 'xd.xenesis.providers.profileDrafts.status', fallback: false },
      { path: 'xd.xenesis.providers.setup.status', fallback: true },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES.map((rule) => ({
      stage: rule.stage,
      matchKind: rule.matchKind,
      path: rule.action.path,
    })),
    [
      { stage: 'early', matchKind: 'guideCatalog', path: 'xd.xenesis.guides.status' },
      { stage: 'early', matchKind: 'diagnosticsCatalog', path: 'xd.xenesis.connections.diagnostics.status' },
      { stage: 'early', matchKind: 'setupRequestCatalog', path: 'xd.xenesis.connections.setupRequests.status' },
      { stage: 'late', matchKind: 'onboarding', path: 'xd.xenesis.onboarding.status' },
      { stage: 'late', matchKind: 'guideContext', path: 'xd.xenesis.guides.status' },
      { stage: 'late', matchKind: 'connectionContext', path: 'xd.xenesis.connections.status' },
    ],
  );
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-guides-catalog-open'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-tools-actions-catalog-open'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-messengers-routing-catalog-open'/);
  assert.doesNotMatch(source, /naturalAction\(\s*'natural-xenesis-connections-center-open'/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_OPEN_ACTIONS\.guides/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_OPEN_ACTIONS\.diagnostics/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_OPEN_ACTIONS\.setupRequests/);
  assert.doesNotMatch(source, /CONNECTION_AGGREGATE_OPEN_ACTIONS\.connections/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_OPEN_ACTIONS\.routing/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_OPEN_ACTIONS\.setup/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_OPEN_ACTIONS\.views/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_OPEN_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /PROVIDER_AGGREGATE_OPEN_ACTIONS\.catalog/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.routing/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.safety/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.accessGroups/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.pairing/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.userStories/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.views/);
  assert.doesNotMatch(source, /MESSENGER_AGGREGATE_OPEN_ACTIONS\.catalog/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.connectors/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.mcpInstallDrafts/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.oauthDrafts/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.views/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.installPlans/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.setup/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.actions/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.userStories/);
  assert.doesNotMatch(source, /TOOL_AGGREGATE_OPEN_ACTIONS\.catalog/);
  assert.deepEqual(
    XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES.map((rule) => ({
      stage: rule.stage,
      matchKind: rule.matchKind,
      path: rule.action.path,
    })),
    [
      { stage: 'guide', matchKind: 'guideCatalog', path: 'xd.xenesis.guides.open' },
      { stage: 'late', matchKind: 'diagnosticsCatalog', path: 'xd.xenesis.connections.diagnostics.open' },
      { stage: 'late', matchKind: 'setupRequestCatalog', path: 'xd.xenesis.connections.setupRequests.open' },
      { stage: 'late', matchKind: 'connectionCenterOpen', path: 'xd.xenesis.connections.open' },
    ],
  );
  assert.equal(
    XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.routing.reason,
    'Open AI provider routing in Xenesis Connection Center from natural language request.',
  );
  assert.deepEqual(
    XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.providers.routing.open', fallback: false },
      { path: 'xd.xenesis.providers.setup.open', fallback: false },
      { path: 'xd.xenesis.providers.views.open', fallback: false },
      { path: 'xd.xenesis.providers.profileDrafts.open', fallback: false },
      { path: 'xd.xenesis.providers.setup.open', fallback: true },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES.map((rule) => ({
      path: rule.action.path,
      requiredGroups: 'requiredContextWordGroups' in rule ? rule.requiredContextWordGroups.length : 0,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.tools.connectors.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.mcpInstallDrafts.open', requiredGroups: 1, fallback: false },
      { path: 'xd.xenesis.tools.oauthDrafts.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.views.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.installPlans.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.setup.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.actions.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.userStories.open', requiredGroups: 0, fallback: false },
      { path: 'xd.xenesis.tools.setup.open', requiredGroups: 0, fallback: true },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.channels.profileDrafts.open', fallback: false },
      { path: 'xd.xenesis.channels.routing.open', fallback: false },
      { path: 'xd.xenesis.channels.safety.open', fallback: false },
      { path: 'xd.xenesis.channels.accessGroups.open', fallback: false },
      { path: 'xd.xenesis.channels.pairing.open', fallback: false },
      { path: 'xd.xenesis.channels.userStories.open', fallback: false },
      { path: 'xd.xenesis.messengers.views.open', fallback: false },
      { path: 'xd.xenesis.messengers.views.open', fallback: true },
    ],
  );
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-provider-routing-open-\$\{provider\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-provider-profile-draft-open-\$\{provider\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-provider-setup-open-\$\{provider\.id\}`/);
  assert.equal(
    XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.routing.idFor('codex-app-server', 'Codex app-server'),
    'natural-xenesis-provider-routing-open-codex-app-server',
  );
  assert.equal(XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.views.path, 'xd.xenesis.providers.views.open');
  assert.equal(
    XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.setup.reasonFor('claude', 'Claude'),
    'Open Claude provider setup from natural language request.',
  );
  assert.doesNotMatch(source, /XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_STATUS_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_PROVIDER_OPEN_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-provider-routing-status-\$\{provider\.id\}`/);
  assert.doesNotMatch(source, /PROVIDER_STATUS_ACTIONS\.routing/);
  assert.doesNotMatch(source, /PROVIDER_STATUS_ACTIONS\.views/);
  assert.doesNotMatch(source, /PROVIDER_STATUS_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /PROVIDER_STATUS_ACTIONS\.setup/);
  assert.doesNotMatch(source, /PROVIDER_OPEN_ACTIONS\.routing/);
  assert.doesNotMatch(source, /PROVIDER_OPEN_ACTIONS\.views/);
  assert.doesNotMatch(source, /PROVIDER_OPEN_ACTIONS\.profileDrafts/);
  assert.doesNotMatch(source, /PROVIDER_OPEN_ACTIONS\.setup/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-tool-mcp-install-draft-status-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-channel-routing-status-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_STATUS_ACTIONS\.toolMcpInstallDraft/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_STATUS_ACTIONS\.toolOauthDraft/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_STATUS_ACTIONS\.channelRouting/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_STATUS_ACTIONS\.messengerView/);
  assert.deepEqual(
    XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES.map((rule) => ({
      targetScope: rule.targetScope,
      argsKind: rule.argsKind,
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      {
        targetScope: 'any',
        argsKind: 'targetId',
        path: 'xd.xenesis.connections.diagnostics.status',
        fallback: false,
      },
      {
        targetScope: 'any',
        argsKind: 'targetId',
        path: 'xd.xenesis.connections.setupRequests.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'tool',
        path: 'xd.xenesis.tools.mcpInstallDrafts.status',
        fallback: false,
      },
      {
        targetScope: 'planned-google-tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.oauthDrafts.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'tool',
        path: 'xd.xenesis.tools.userStories.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'tool',
        path: 'xd.xenesis.tools.actions.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'tool',
        path: 'xd.xenesis.tools.installPlans.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.setup.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'tool',
        path: 'xd.xenesis.tools.connectors.status',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.views.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.routing.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.safety.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.accessGroups.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.pairing.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'targetId',
        path: 'xd.xenesis.channels.userStories.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.profileDrafts.status',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'targetId',
        path: 'xd.xenesis.messengers.views.status',
        fallback: false,
      },
      {
        targetScope: 'any',
        argsKind: 'targetId',
        path: 'xd.xenesis.connections.diagnostics.status',
        fallback: true,
      },
    ],
  );
  assert.equal(
    XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.routing.idFor('auto', 'auto'),
    'natural-xenesis-provider-routing-status-auto',
  );
  assert.deepEqual(
    XENESIS_NATURAL_PROVIDER_STATUS_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.providers.routing.status', fallback: false },
      { path: 'xd.xenesis.providers.views.status', fallback: false },
      { path: 'xd.xenesis.providers.profileDrafts.status', fallback: false },
      { path: 'xd.xenesis.providers.setup.status', fallback: true },
    ],
  );
  assert.deepEqual(
    XENESIS_NATURAL_PROVIDER_OPEN_RULES.map((rule) => ({
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      { path: 'xd.xenesis.providers.routing.open', fallback: false },
      { path: 'xd.xenesis.providers.profileDrafts.open', fallback: false },
      { path: 'xd.xenesis.providers.views.open', fallback: false },
      { path: 'xd.xenesis.providers.setup.open', fallback: false },
    ],
  );
  assert.equal(
    XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolMcpInstallDraft.path,
    'xd.xenesis.tools.mcpInstallDrafts.status',
  );
  assert.equal(
    XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelRouting.idFor('telegram', 'Telegram'),
    'natural-xenesis-channel-routing-status-telegram',
  );
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-connection-diagnostics-open-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-tool-mcp-install-draft-open-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-channel-routing-open-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-connection-open-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_OPEN_ACTIONS\.toolOauthDraft/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_OPEN_ACTIONS\.toolMcpInstallDraft/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_OPEN_ACTIONS\.channelRouting/);
  assert.doesNotMatch(source, /CONNECTION_TARGET_OPEN_ACTIONS\.connectionCard/);
  assert.deepEqual(
    XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES.map((rule) => ({
      targetScope: rule.targetScope,
      argsKind: rule.argsKind,
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      {
        targetScope: 'any',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.connections.diagnostics.open',
        fallback: false,
      },
      {
        targetScope: 'any',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.connections.setupRequests.open',
        fallback: false,
      },
      {
        targetScope: 'planned-google-tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.oauthDrafts.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.mcpInstallDrafts.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.userStories.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.actions.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.installPlans.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.connectors.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.setup.open',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.tools.views.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.channels.userStories.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channelVisible',
        path: 'xd.xenesis.channels.profileDrafts.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channelVisible',
        path: 'xd.xenesis.channels.routing.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channelVisible',
        path: 'xd.xenesis.channels.safety.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channelVisible',
        path: 'xd.xenesis.channels.accessGroups.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channelVisible',
        path: 'xd.xenesis.channels.pairing.open',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.messengers.views.open',
        fallback: false,
      },
      {
        targetScope: 'any',
        argsKind: 'targetIdVisible',
        path: 'xd.xenesis.connections.open',
        fallback: true,
      },
    ],
  );
  assert.equal(
    XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.diagnostics.idFor('notion', 'Notion'),
    'natural-xenesis-connection-diagnostics-open-notion',
  );
  assert.equal(
    XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolMcpInstallDraft.path,
    'xd.xenesis.tools.mcpInstallDrafts.open',
  );
  assert.equal(
    XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelRouting.reasonFor('telegram', 'Telegram'),
    'Open Telegram channel routing from natural language request.',
  );
  assert.doesNotMatch(source, /XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-provider-profile-draft-request-\$\{provider\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-tool-mcp-install-draft-request-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /naturalAction\(\s*`natural-xenesis-connection-setup-request-\$\{target\.id\}`/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.providerProfileDraft/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.toolInstallPlan/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.toolMcpInstallDraft/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.toolOauthDraft/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.toolActionPolicy/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.channelProfileDraft/);
  assert.doesNotMatch(source, /REVIEW_REQUEST_ACTIONS\.connectionSetupRequest/);
  assert.deepEqual(
    XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES.map((rule) => ({
      argsKind: rule.argsKind,
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [{ argsKind: 'provider', path: 'xd.xenesis.providers.profileDrafts.request', fallback: true }],
  );
  assert.deepEqual(
    XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES.map((rule) => ({
      targetScope: rule.targetScope,
      argsKind: rule.argsKind,
      path: rule.action.path,
      fallback: 'fallback' in rule && rule.fallback === true,
    })),
    [
      {
        targetScope: 'tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.installPlans.request',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.mcpInstallDrafts.request',
        fallback: false,
      },
      {
        targetScope: 'planned-google-tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.oauthDrafts.request',
        fallback: false,
      },
      {
        targetScope: 'tool',
        argsKind: 'targetId',
        path: 'xd.xenesis.tools.actions.request',
        fallback: false,
      },
      {
        targetScope: 'messenger',
        argsKind: 'channel',
        path: 'xd.xenesis.channels.profileDrafts.request',
        fallback: false,
      },
      {
        targetScope: 'any',
        argsKind: 'targetId',
        path: 'xd.xenesis.connections.setupRequests.request',
        fallback: true,
      },
    ],
  );
  for (const movedTargetArrayImport of [
    'XENESIS_NATURAL_ARRANGE_MODE_TARGETS',
    'XENESIS_NATURAL_CONNECTION_TARGETS',
    'XENESIS_NATURAL_CORE_TOOL_TARGETS',
    'XENESIS_NATURAL_DOCK_SIDE_TARGETS',
    'XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS',
    'XENESIS_NATURAL_ONBOARDING_STEP_TARGETS',
    'XENESIS_NATURAL_PLACEMENT_TARGETS',
    'XENESIS_NATURAL_PROVIDER_TARGETS',
    'XENESIS_NATURAL_VIEW_TARGETS',
    'XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS',
  ]) {
    assert.doesNotMatch(source, new RegExp(movedTargetArrayImport));
  }
  for (const directTargetLookupPattern of [
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_ARRANGE_MODE_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_CONNECTION_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_CORE_TOOL_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_DOCK_SIDE_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_PLACEMENT_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_PROVIDER_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_VIEW_TARGETS\\)',
    'findXenesisNaturalWordsTarget\\(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS\\)',
  ]) {
    assert.doesNotMatch(source, new RegExp(directTargetLookupPattern));
  }
  for (const catalogFinder of [
    'findXenesisNaturalConnectionTarget',
    'findXenesisNaturalCoreToolTarget',
    'findXenesisNaturalOnboardingStepTarget',
    'findXenesisNaturalProviderTarget',
    'findXenesisNaturalViewTarget',
  ]) {
    assert.match(naturalPlannerSource, new RegExp(catalogFinder));
    assert.match(catalogSource, new RegExp(`export function ${catalogFinder}`));
  }
  for (const catalogFinder of [
    'findXenesisNaturalArrangeModeTarget',
    'findXenesisNaturalDockSideTarget',
    'findXenesisNaturalDockWindowStateTarget',
    'findXenesisNaturalPlacementTarget',
    'findXenesisNaturalWindowSizePresetTarget',
  ]) {
    assert.doesNotMatch(source, new RegExp(catalogFinder));
    assert.match(catalogSource, new RegExp(`export function ${catalogFinder}`));
  }
  assert.doesNotMatch(source, /if \(hasAny\(value, \['오른쪽', '우측', 'right'\]\)\) return 'right';/);
  assert.doesNotMatch(source, /if \(hasAny\(value, \['uhd', '3840', '2160', '4k'\]\)\) return 'uhd';/);
  assert.deepEqual(
    XENESIS_NATURAL_PLACEMENT_TARGETS.map((target) => target.id),
    ['right', 'left', 'top', 'bottom', 'tab'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DOCK_SIDE_TARGETS.map((target) => target.id),
    ['right', 'left', 'top', 'bottom'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS.map((target) => target.id),
    ['document', 'right', 'left', 'top', 'bottom'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_ARRANGE_MODE_TARGETS.map((target) => target.id),
    ['grid', 'column', 'row'],
  );
  assert.deepEqual(
    XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS.map((target) => target.id),
    ['uhd', 'qhd', 'fhd', 'hd'],
  );
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_ACTION_INTENT_RULES/);
  assert.match(naturalPlannerSource, /XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_ACTION_INTENT_WORDS/);
  assert.doesNotMatch(source, /XENESIS_NATURAL_EXPLICIT_OPEN_WORDS/);
  assert.doesNotMatch(source, /return hasAny\(value, \[\s*'열어',\s*'켜줘'[\s\S]*?'terminal',\s*'pane',\s*\]\);/);
  assert.deepEqual(XENESIS_NATURAL_EXPLICIT_OPEN_WORDS, ['열어', '켜줘', '띄워', '포커스', '집중']);
  assert.equal(XENESIS_NATURAL_ACTION_INTENT_WORDS.includes('authorize'), true);
  assert.equal(XENESIS_NATURAL_ACTION_INTENT_WORDS.includes('terminal'), true);
  assert.match(naturalPlannerSource, /findXenesisNaturalGuideTarget/);
  assert.doesNotMatch(source, /const toolIntegrationGuide/);
  assert.doesNotMatch(source, /const channelSetupGuide/);
  assert.doesNotMatch(source, /let id = 'onboarding-connections'/);
  assert.deepEqual(
    XENESIS_NATURAL_GUIDE_TARGETS.map((target) => target.id),
    [
      'agent-user-stories',
      'external-tool-integrations',
      'openclaw-channel-setup',
      'cr-mcp-gateway-bots',
      'onboarding-connections',
    ],
  );
  assert.match(naturalPlannerSource, /findXenesisNaturalOnboardingStepTarget/);
  assert.doesNotMatch(source, /const steps:\s*Array<\{ id: string; label: string; words: readonly string\[\] \}>/);
  assert.doesNotMatch(source, /words:\s*\['first chat'/);
  assert.deepEqual(
    XENESIS_NATURAL_ONBOARDING_STEP_TARGETS.map((target) => target.id),
    ['first-chat', 'local-cli-mcp', 'recommended-tools', 'gateway', 'messenger-routing', 'test-send'],
  );
});

test('XenesisAgentPane wires natural-language plans before provider runs', () => {
  const source = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');

  assert.match(source, /planXenesisDeskNaturalLanguageActions/);
  assert.match(source, /routingOptions\.bypassNaturalDeskRouting/);
  assert.match(source, /shouldRunXenesisDeskActionsDirectly\(naturalDeskActionRequest\)/);
  assert.match(source, /Direct natural Desk action prompt/);
});

test('parseXenesisDeskActionBlocks extracts Desk CR actions and hides them from visible chat', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      'Open the terminal on the right.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Need a shell"}',
      '```',
      '',
      'Done.',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, 'Open the terminal on the right.\n\nDone.');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.views.open',
      args: { kind: 'terminal', placement: 'right', command: 'Write-Output "ready"', shell: 'powershell' },
      approved: false,
      reason: 'Need a shell',
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('parseXenesisDeskActionBlocks treats raw action JSON as a direct Desk action', () => {
  const parsed = parseXenesisDeskActionBlocks(
    '{"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true}',
  );

  assert.equal(parsed.visibleText, '');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.window.sizer.applyPreset',
      args: { presetId: 'qhd' },
      approved: true,
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('parseXenesisDeskActionBlocks accepts arrays and rejects non-CR paths', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '```xenesis-desk-actions',
      '[',
      '  {"path":"xd.window.sizer.applyPreset","args":{"preset":"QHD"}},',
      '  {"path":"shell.rm","args":{"path":"C:/"}}',
      ']',
      '```',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, '');
  assert.equal(parsed.actions.length, 1);
  assert.equal(parsed.actions[0]?.path, 'xd.window.sizer.applyPreset');
  assert.match(parsed.errors[0] || '', /must start with xd\./);
});

test('runXenesisDeskActions calls the direct CR executor in order', async () => {
  const calls: Array<{ path: string; args: unknown; approved: boolean | undefined }> = [];
  const results = await runXenesisDeskActions(
    [
      { id: 'a', path: 'xd.app.status', args: {}, approved: false },
      { id: 'b', path: 'xd.window.sizer.applyPreset', args: { presetId: 'qhd' }, approved: true },
    ],
    async (path, args, options) => {
      calls.push({ path, args, approved: options?.approved });
      return { ok: true, path, result: { path } };
    },
  );

  assert.deepEqual(calls, [
    { path: 'xd.app.status', args: {}, approved: false },
    { path: 'xd.window.sizer.applyPreset', args: { presetId: 'qhd' }, approved: true },
  ]);
  assert.equal(
    results.every((result) => result.ok),
    true,
  );
});

test('parseXenesisDeskActionBlocks accepts approved CR workflow actions', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '```xenesis-desk-action',
      '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model"}}]}}',
      '```',
    ].join('\n'),
  );

  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.automation.workflow.run',
      args: {
        name: 'settings-tour',
        steps: [{ path: 'xd.dock.panes.list' }, { path: 'xd.panes.settings.open', args: { category: 'run-model' } }],
      },
      approved: true,
    },
  ]);
});

test('parseXenesisDeskActionBlocks accepts provider inline fence payloads', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '상태를 확인하겠습니다.```xenesis-desk-action {"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true}',
      '',
      '노션 연결 카드를 열고 포커스했습니다.',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, '상태를 확인하겠습니다.\n\n노션 연결 카드를 열고 포커스했습니다.');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.xenesis.connections.open',
      args: { id: 'notion', ensureVisible: true },
      approved: true,
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('Desk action completion summaries include CR workflow run counts', () => {
  const completed = buildXenesisDeskActionCompletedMessage([
    {
      id: 'workflow',
      path: 'xd.automation.workflow.run',
      args: {},
      approved: true,
      ok: true,
      result: {
        name: 'settings-tour',
        completed: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
      },
    },
  ]);

  assert.match(completed, /settings-tour: 2 completed, 2 passed, 0 failed, 0 skipped/);
});

test('pendingXenesisDeskActionsFromResults preserves approval-required Desk actions', async () => {
  const actions = [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: false, reason: 'Open terminal' },
    { id: 'b', path: 'xd.app.status', args: {}, approved: false },
  ];
  const results = await runXenesisDeskActions(actions, async (path) => {
    if (path === 'xd.views.open') {
      return {
        ok: false,
        path,
        error: 'Capability requires approval: xd.views.open',
        approvalRequired: true,
      };
    }
    return { ok: true, path, result: { ok: true } };
  });

  assert.deepEqual(pendingXenesisDeskActionsFromResults(actions, results), [actions[0]]);
});

test('approveXenesisDeskActions creates approved copies without mutating pending actions', () => {
  const pending = [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: false, reason: 'Open terminal' },
  ];

  const approved = approveXenesisDeskActions(pending);

  assert.deepEqual(approved, [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: true, reason: 'Open terminal' },
  ]);
  assert.equal(pending[0]?.approved, false);
});

test('Desk action user messages hide raw DSL behind pending and completion summaries', () => {
  const actions = [
    {
      id: 'a',
      path: 'xd.views.open',
      args: { kind: 'terminal', placement: 'right' },
      approved: false,
      reason: 'Open terminal',
    },
  ];
  const pending = buildXenesisDeskActionPendingMessage(actions, '터미널을 열려면 승인이 필요합니다.');
  const completed = buildXenesisDeskActionCompletedMessage([
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal', placement: 'right' }, approved: true, ok: true },
  ]);

  assert.match(pending, /승인이 필요합니다/);
  assert.match(pending, /xd\.views\.open/);
  assert.doesNotMatch(pending, /```xenesis-desk-action/);
  assert.match(completed, /Desk action completed/);
  assert.match(completed, /xd\.views\.open/);
});

test('Desk action completion summaries include useful read and control results', () => {
  const completed = buildXenesisDeskActionCompletedMessage([
    {
      id: 'files',
      path: 'xd.files.listOpen',
      args: {},
      approved: false,
      ok: true,
      result: {
        openFiles: [
          { title: 'README.md', filePath: 'D:\\Project\\README.md' },
          { title: 'notes.md', filePath: 'D:\\Project\\notes.md' },
        ],
      },
    },
    {
      id: 'capture',
      path: 'xd.capture.activePane',
      args: {},
      approved: false,
      ok: true,
      result: {
        filePath: 'C:\\Users\\devuser\\.xenesis-dev\\captures\\pane.png',
        width: 1280,
        height: 720,
      },
    },
    {
      id: 'size',
      path: 'xd.window.sizer.applyPreset',
      args: { presetId: 'qhd' },
      approved: false,
      ok: true,
      result: {
        bounds: { x: 0, y: 0, width: 2560, height: 1440 },
      },
    },
  ]);

  assert.match(completed, /README\.md/);
  assert.match(completed, /2 files/);
  assert.match(completed, /pane\.png/);
  assert.match(completed, /1280x720/);
  assert.match(completed, /2560x1440/);
});

test('shouldRunXenesisDeskActionsDirectly detects explicit user-provided CR action blocks', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      'Please apply this Desk action.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.views.open","args":{"kind":"terminal","placement":"bottom","command":"Write-Output \\"ready\\"","shell":"powershell"},"approved":true}',
      '```',
    ].join('\n'),
  );

  assert.equal(shouldRunXenesisDeskActionsDirectly(parsed), true);
  assert.equal(parsed.visibleText, 'Please apply this Desk action.');
  assert.equal(parsed.actions.length, 1);
});

test('buildXenesisDeskControlPromptHint describes native CR control without external MCP dependency', () => {
  const hint = buildXenesisDeskControlPromptHint();
  assert.match(hint, /native Xenesis Desk Capability Registry/i);
  assert.match(hint, /xenesis-desk-action/);
  assert.match(hint, /xd\.views\.open/);
  assert.match(hint, /"command":"Write-Output \\"ready\\""/);
  assert.match(hint, /MUST return a `xenesis-desk-action` block/i);
  assert.match(hint, /not executing code/i);
  assert.match(hint, /file\/process sandbox does not apply/i);
  assert.doesNotMatch(hint, /requires external MCP/i);
});

test('buildXenesisDeskControlPromptHint lists real high-value CR paths and avoids stale aliases', () => {
  const hint = buildXenesisDeskControlPromptHint();

  assert.match(hint, /Connection Center CR paths discovered from Capability Registry/i);
  assert.match(hint, /xd\.window\.sizer\.applyPreset/);
  assert.match(hint, /presetId/);
  assert.match(hint, /xd\.dock\.artifactTarget\.set/);
  assert.match(hint, /xd\.xenesis\.connections\.open/);
  assert.match(hint, /xd\.xenesis\.connections\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.diagnostics\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.diagnostics\.open/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.open/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.request/);
  assert.match(hint, /xd\.testing\.connectionCenter\.snapshot/);
  assert.match(hint, /xd\.xenesis\.onboarding\.status/);
  assert.match(hint, /xd\.xenesis\.onboarding\.open/);
  assert.match(hint, /xd\.xenesis\.guides\.status/);
  assert.match(hint, /xd\.xenesis\.guides\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.setup\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.setup\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.routing\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.routing\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.views\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.views\.open/);
  assert.match(hint, /xd\.localCli\.scan/);
  assert.match(hint, /xd\.mcp\.settings\.status/);
  assert.match(hint, /xd\.mcp\.bridge\.status/);
  assert.match(hint, /xd\.xenesis\.gateway\.status/);
  assert.match(hint, /xd\.xenesis\.gateway\.openDashboard/);
  assert.match(hint, /xd\.xenesis\.workspace\.set/);
  assert.match(hint, /xd\.xenesis\.diagnostics/);
  assert.match(hint, /xd\.xenesis\.reports\.list/);
  assert.match(hint, /xd\.xenesis\.tasks\.list/);
  assert.match(hint, /xd\.xenesis\.agents\.list/);
  assert.match(hint, /xd\.xenesis\.agents\.status/);
  assert.match(hint, /xd\.xenesis\.agents\.events/);
  assert.match(hint, /xd\.xenesis\.agents\.submit/);
  assert.match(hint, /xd\.xenesis\.profiles\.list/);
  assert.match(hint, /xd\.xenesis\.runs\.cancel/);
  assert.match(hint, /xd\.xenesis\.sessions\.reset/);
  assert.match(hint, /xd\.xenesis\.tools\.setup\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.setup\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.connectors\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.views\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.views\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.request/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.request/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.channels\.accessGroups\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.pairing\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.pairing\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.routing\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.routing\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.safety\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.safety\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.accessGroups\.open/);
  assert.match(hint, /xd\.xenesis\.messengers\.views\.status/);
  assert.match(hint, /xd\.xenesis\.messengers\.views\.open/);
  assert.match(hint, /tool action catalogs are review-only/i);
  assert.match(hint, /tool OAuth drafts are review-only/i);
  assert.match(hint, /do not complete OAuth/i);
  assert.match(hint, /store tokens/i);
  assert.match(hint, /write MCP config/i);
  assert.match(hint, /execute provider tools/i);
  assert.match(hint, /send email/i);
  assert.match(hint, /mutate documents/i);
  assert.match(hint, /mutate calendar events/i);
  assert.match(hint, /provider profile drafts are review-only/i);
  assert.match(hint, /do not mutate provider settings/i);
  assert.match(hint, /store credentials/i);
  assert.match(hint, /switch local CLI/i);
  assert.match(hint, /run provider prompts/i);
  assert.match(hint, /channel profile drafts are review-only/i);
  assert.match(hint, /"id":"notion"/);
  assert.match(hint, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.match(hint, /xd\.automation\.workflow\.preview/);
  assert.match(hint, /xd\.automation\.workflow\.run/);
  assert.match(hint, /Xenesis Agent should own generation through `\/artifact`/);
  assert.match(hint, /GowooriChat is fallback only/);
  assert.match(hint, /"kind":"xenesisAgent","placement":"right"/);
  assert.match(hint, /"useActive":true/);
  assert.match(hint, /tool install plans are review-only/i);
  assert.match(hint, /ordered multi-step Desk control/i);
  assert.match(hint, /do not refuse/i);
  assert.match(hint, /runtime is read-only/i);
  assert.match(hint, /Capability Registry will enforce/i);
  assert.match(hint, /quoted Agent pane message/i);
  assert.match(hint, /quoted prompt/i);
  assert.match(hint, /gateway, workspace, and active-run status/i);

  assert.doesNotMatch(hint, /xd\.gowoori\.open/);
  assert.doesNotMatch(hint, /xd\.terminals\.spawn/);
  assert.match(hint, /xd\.dock\.panes\.list/);
});

test('planXenesisDeskNaturalLanguageActions maps local CLI and MCP readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('MCP 설정 상태 보여줘').actions, [
    {
      id: 'natural-mcp-settings-status',
      path: 'xd.mcp.settings.status',
      args: {},
      approved: false,
      reason: 'Read MCP settings status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('MCP 브리지 상태 보여줘').actions, [
    {
      id: 'natural-mcp-bridge-status',
      path: 'xd.mcp.bridge.status',
      args: {},
      approved: false,
      reason: 'Read MCP bridge status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI 스캔해줘').actions, [
    {
      id: 'natural-local-cli-scan',
      path: 'xd.localCli.scan',
      args: {},
      approved: false,
      reason: 'Scan local CLI agents from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-open-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion MCP install draft from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps gateway read and dashboard prompts to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-gateway-status',
      path: 'xd.xenesis.gateway.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis gateway status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis gateway dashboard 열어줘').actions, [
    {
      id: 'natural-xenesis-gateway-dashboard-open',
      path: 'xd.xenesis.gateway.openDashboard',
      args: {},
      approved: false,
      reason: 'Open Xenesis gateway dashboard from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-gateway',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'gateway' },
      approved: false,
      reason: 'Read Gateway onboarding checklist status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps runtime inventory readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-status',
      path: 'xd.xenesis.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis runtime status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 운영 진단 보여줘').actions, [
    {
      id: 'natural-xenesis-diagnostics',
      path: 'xd.xenesis.diagnostics',
      args: {},
      approved: false,
      reason: 'Read Xenesis operational diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 리포트 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-reports-list',
      path: 'xd.xenesis.reports.list',
      args: {},
      approved: false,
      reason: 'List Xenesis reports from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 태스크 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-tasks-list',
      path: 'xd.xenesis.tasks.list',
      args: {},
      approved: false,
      reason: 'List Xenesis tasks from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-agents-list',
      path: 'xd.xenesis.agents.list',
      args: {},
      approved: false,
      reason: 'List registered Xenesis Agent panes from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent" 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-agent-status',
      path: 'xd.xenesis.agents.status',
      args: { agentId: 'xenesis-agent' },
      approved: false,
      reason: 'Read Xenesis Agent pane status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent" 이벤트 보여줘').actions, [
    {
      id: 'natural-xenesis-agent-events',
      path: 'xd.xenesis.agents.events',
      args: { agentId: 'xenesis-agent' },
      approved: false,
      reason: 'List Xenesis Agent pane events from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps profile inventory prompts to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis profile 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-profiles-list',
      path: 'xd.xenesis.profiles.list',
      args: {},
      approved: false,
      reason: 'List Xenesis profiles from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('제네시스 active profile 확인해줘').actions, [
    {
      id: 'natural-xenesis-profiles-list',
      path: 'xd.xenesis.profiles.list',
      args: {},
      approved: false,
      reason: 'List Xenesis profiles from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps runtime control prompts to CR actions', () => {
  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis runtime run "연결 상태를 요약해줘" 실행해줘').actions,
    [
      {
        id: 'natural-xenesis-runs-start',
        path: 'xd.xenesis.runs.start',
        args: { prompt: '연결 상태를 요약해줘' },
        approved: false,
        reason: 'Start Xenesis run from natural language request.',
      },
    ],
  );

  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent"에 "연결 상태 요약해줘" 보내줘').actions,
    [
      {
        id: 'natural-xenesis-agent-submit',
        path: 'xd.xenesis.agents.submit',
        args: { agentId: 'xenesis-agent', text: '연결 상태 요약해줘' },
        approved: false,
        reason: 'Submit Xenesis Agent pane message from natural language request.',
      },
    ],
  );

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis runtime run 취소해줘').actions, [
    {
      id: 'natural-xenesis-runs-cancel',
      path: 'xd.xenesis.runs.cancel',
      args: {},
      approved: false,
      reason: 'Cancel active Xenesis run from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('제네시스 세션 초기화해줘').actions, [
    {
      id: 'natural-xenesis-sessions-reset',
      path: 'xd.xenesis.sessions.reset',
      args: {},
      approved: false,
      reason: 'Reset active Xenesis session from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps workspace binding prompts to CR actions', () => {
  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis workspace를 "E:\\Workspace\\plane"로 설정해줘').actions,
    [
      {
        id: 'natural-xenesis-workspace-set',
        path: 'xd.xenesis.workspace.set',
        args: { path: 'E:\\Workspace\\plane' },
        approved: false,
        reason: 'Set Xenesis workspace from natural language request.',
      },
    ],
  );

  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('제네시스 워크스페이스를 "D:\\Projects\\desk app"로 바꿔줘').actions,
    [
      {
        id: 'natural-xenesis-workspace-set',
        path: 'xd.xenesis.workspace.set',
        args: { path: 'D:\\Projects\\desk app' },
        approved: false,
        reason: 'Set Xenesis workspace from natural language request.',
      },
    ],
  );
});

test('planXenesisDeskNaturalLanguageActions maps common Korean Desk control requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 열어줘').actions, [
    {
      id: 'natural-settings-open',
      path: 'xd.panes.settings.open',
      args: { placement: 'tab' },
      approved: false,
      reason: 'Open settings from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오른쪽에 거울이 챗 열어줘').actions, [
    {
      id: 'natural-gowoori-chat-open',
      path: 'xd.views.open',
      args: { kind: 'gowooriChat', placement: 'right' },
      approved: false,
      reason: 'Open GowooriChat from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인을 캡쳐해줘').actions, [
    {
      id: 'natural-capture-active-pane',
      path: 'xd.capture.activePane',
      args: {},
      approved: false,
      reason: 'Capture the active pane from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('액션 인박스 목록 보여줘').actions, [
    {
      id: 'natural-mcp-action-inbox-list',
      path: 'xd.mcp.actionInbox.list',
      args: {},
      approved: false,
      reason: 'List Action Inbox items from natural language request.',
    },
  ]);
  assert.equal(
    planXenesisDeskNaturalLanguageActions('액션 인박스 목록 보여줘').visibleText,
    'Action Inbox 목록을 조회합니다.',
  );

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Action Inbox 열어줘').actions, [
    {
      id: 'natural-tool-hermes-action-inbox-open',
      path: 'xd.tools.core.hermesActionInbox.open',
      args: { placement: 'tab' },
      approved: false,
      reason: 'Open Hermes Action Inbox from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions covers read, layout, and window-size requests', () => {
  assert.equal(planXenesisDeskNaturalLanguageActions('열린 파일 목록 보여줘').actions[0]?.path, 'xd.files.listOpen');
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('창 크기를 QHD로 바꿔줘').actions[0]?.args, {
    presetId: 'qhd',
  });
  assert.equal(
    planXenesisDeskNaturalLanguageActions('현재 그룹을 바둑판 정렬해줘').actions[0]?.path,
    'xd.dock.arrangeGrid',
  );
});

test('planXenesisDeskNaturalLanguageActions maps terminal execution requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널 목록 보여줘').actions, [
    {
      id: 'natural-terminals-list',
      path: 'xd.terminals.list',
      args: {},
      approved: false,
      reason: 'List terminals from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널 10개 띄우고 바둑판 정렬해줘').actions, [
    {
      id: 'natural-terminal-run-many',
      path: 'xd.terminals.runMany',
      args: {
        count: 10,
        shell: 'powershell',
        command: 'Write-Host Xenesis-Desk-terminal',
        idPrefix: 'xenesis-agent-natural',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open multiple terminals from natural language request.',
    },
    {
      id: 'natural-dock-window-arrange',
      path: 'xd.dock.window.arrange',
      args: { windowState: 'document', mode: 'grid' },
      approved: false,
      reason: 'Arrange a Desk window area from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널에서 npm test 실행해줘').actions, [
    {
      id: 'natural-terminal-run',
      path: 'xd.terminals.run',
      args: { command: 'npm test', shell: 'powershell', placement: 'tab' },
      approved: false,
      reason: 'Run terminal command from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps active-pane and scoped dock requests', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오른쪽 패인 폭을 720으로 바꿔줘').actions, [
    {
      id: 'natural-dock-size-set',
      path: 'xd.dock.sizes.set',
      args: { right: 720 },
      approved: false,
      reason: 'Resize a dock side from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인에 포커스 해줘').actions, [
    {
      id: 'natural-dock-focus-active',
      path: 'xd.dock.focus',
      args: { useActive: true },
      approved: false,
      reason: 'Focus the active dock content from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 탭 닫아줘').actions, [
    {
      id: 'natural-dock-close-active',
      path: 'xd.dock.close',
      args: { useActive: true },
      approved: false,
      reason: 'Close the active dock content from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('문서 영역을 바둑판 정렬해줘').actions, [
    {
      id: 'natural-dock-window-arrange',
      path: 'xd.dock.window.arrange',
      args: { windowState: 'document', mode: 'grid' },
      approved: false,
      reason: 'Arrange a Desk window area from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인을 세로 정렬해줘').actions, [
    {
      id: 'natural-dock-pane-arrange',
      path: 'xd.dock.pane.arrange',
      args: { useActive: true, mode: 'column' },
      approved: false,
      reason: 'Arrange the active dock pane from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('문서 영역 탭을 다시 합쳐줘').actions, [
    {
      id: 'natural-dock-window-merge',
      path: 'xd.dock.window.merge',
      args: { windowState: 'document' },
      approved: false,
      reason: 'Merge a Desk window area from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps tools and explorer filter requests', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('네트워크 모니터를 오른쪽에 열어줘').actions, [
    {
      id: 'natural-tool-network-monitor-open',
      path: 'xd.tools.core.networkMonitor.open',
      args: { placement: 'right' },
      approved: false,
      reason: 'Open Network Monitor from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('작업 실행 패널 열어줘').actions, [
    {
      id: 'natural-tool-run-task-panel-open',
      path: 'xd.tools.core.runTaskPanel.open',
      args: { placement: 'tab' },
      approved: false,
      reason: 'Open Run Task Panel from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('탐색기에서 src 필터 걸어줘').actions, [
    {
      id: 'natural-explorer-filter',
      path: 'xd.explorer.local.setFilter',
      args: { query: 'src' },
      approved: false,
      reason: 'Filter explorer from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps Connection Center requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 센터 열어줘').actions, [
    {
      id: 'natural-xenesis-connections-center-open',
      path: 'xd.xenesis.connections.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 진단 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-catalog-open',
      path: 'xd.xenesis.connections.diagnostics.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 요청 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-catalog-open',
      path: 'xd.xenesis.connections.setupRequests.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 프로필 초안 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { ensureVisible: true },
      approved: false,
      reason:
        'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('channel profile draft 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { ensureVisible: true },
      approved: false,
      reason:
        'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('가이드 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-guides-catalog-open',
      path: 'xd.xenesis.guides.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('guide catalog 열어줘').actions, [
    {
      id: 'natural-xenesis-guides-catalog-open',
      path: 'xd.xenesis.guides.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 카드 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-open-notion',
      path: 'xd.xenesis.connections.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection card from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 초안 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-open-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar OAuth draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-onboarding-connections',
      path: 'xd.xenesis.guides.open',
      args: { id: 'onboarding-connections', ensureVisible: true },
      approved: false,
      reason: 'Open Onboarding and connections guide from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 메신저 설정 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-telegram',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram messenger view from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps guide file open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-onboarding-connections',
      path: 'xd.xenesis.guides.open',
      args: { id: 'onboarding-connections', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Onboarding and connections guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('CR MCP 게이트웨이 문서 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-cr-mcp-gateway-bots',
      path: 'xd.xenesis.guides.open',
      args: { id: 'cr-mcp-gateway-bots', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Capability Registry, MCP, gateway, and bots guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('사용자 스토리 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-agent-user-stories',
      path: 'xd.xenesis.guides.open',
      args: { id: 'agent-user-stories', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Agent user stories guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('헤르메스 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-agent-user-stories',
      path: 'xd.xenesis.guides.open',
      args: { id: 'agent-user-stories', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Agent user stories guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오픈클로 채널 가이드 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-openclaw-channel-setup',
      path: 'xd.xenesis.guides.open',
      args: { id: 'openclaw-channel-setup', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open OpenClaw-style channel setup guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 통합 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-external-tool-integrations',
      path: 'xd.xenesis.guides.open',
      args: { id: 'external-tool-integrations', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open External tool integrations guide file from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps onboarding checklist open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-center-open',
      path: 'xd.xenesis.onboarding.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 체크리스트 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-center-open',
      path: 'xd.xenesis.onboarding.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('첫 채팅 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-first-chat',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'first-chat', ensureVisible: true },
      approved: false,
      reason: 'Open First chat onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI MCP 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-local-cli-mcp',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'local-cli-mcp', ensureVisible: true },
      approved: false,
      reason: 'Open Local CLI and MCP onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('추천 도구 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-recommended-tools',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'recommended-tools', ensureVisible: true },
      approved: false,
      reason: 'Open Recommended tools onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-gateway',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'gateway', ensureVisible: true },
      approved: false,
      reason: 'Open Gateway onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('메신저 라우팅 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-messenger-routing',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'messenger-routing', ensureVisible: true },
      approved: false,
      reason: 'Open Messenger routing onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('엔드투엔드 테스트 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-test-send',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'test-send', ensureVisible: true },
      approved: false,
      reason: 'Open End-to-end test onboarding checklist step from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps detailed Connection Center open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-setup-catalog-open',
      path: 'xd.xenesis.providers.setup.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider routing 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-routing-catalog-open',
      path: 'xd.xenesis.providers.routing.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open AI provider routing in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider view 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-views-catalog-open',
      path: 'xd.xenesis.providers.views.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-profile-drafts-catalog-open',
      path: 'xd.xenesis.providers.profileDrafts.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-catalog-open',
      path: 'xd.xenesis.providers.setup.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open AI provider catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 connector 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-connectors-catalog-open',
      path: 'xd.xenesis.tools.connectors.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 setup 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-setup-catalog-open',
      path: 'xd.xenesis.tools.setup.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 view 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-views-catalog-open',
      path: 'xd.xenesis.tools.views.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool view catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 설치 계획 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-install-plans-catalog-open',
      path: 'xd.xenesis.tools.installPlans.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 OAuth 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-oauth-drafts-catalog-open',
      path: 'xd.xenesis.tools.oauthDrafts.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 MCP 설치 초안 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-mcp-install-drafts-catalog-open',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      args: { ensureVisible: true },
      approved: false,
      reason:
        'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 액션 정책 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-actions-catalog-open',
      path: 'xd.xenesis.tools.actions.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 사용자 스토리 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tools-user-stories-catalog-open',
      path: 'xd.xenesis.tools.userStories.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-catalog-open',
      path: 'xd.xenesis.tools.setup.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external tool catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 setup 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-catalog-open',
      path: 'xd.xenesis.messengers.views.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 라우팅 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-routing-catalog-open',
      path: 'xd.xenesis.channels.routing.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 안전 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-safety-catalog-open',
      path: 'xd.xenesis.channels.safety.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 접근 그룹 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-access-groups-catalog-open',
      path: 'xd.xenesis.channels.accessGroups.open',
      args: { ensureVisible: true },
      approved: false,
      reason:
        'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 페어링 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-pairing-catalog-open',
      path: 'xd.xenesis.channels.pairing.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 사용자 스토리 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-user-stories-catalog-open',
      path: 'xd.xenesis.channels.userStories.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 view 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-views-catalog-open',
      path: 'xd.xenesis.messengers.views.open',
      args: { ensureVisible: true },
      approved: false,
      reason: 'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-setup-open-auto',
      path: 'xd.xenesis.providers.setup.open',
      args: { provider: 'auto', ensureVisible: true },
      approved: false,
      reason: 'Open auto provider setup from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider view 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-view-open-codex-app-server',
      path: 'xd.xenesis.providers.views.open',
      args: { provider: 'codex-app-server', ensureVisible: true },
      approved: false,
      reason: 'Open codex-app-server provider view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider routing 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-routing-open-codex-app-server',
      path: 'xd.xenesis.providers.routing.open',
      args: { provider: 'codex-app-server', ensureVisible: true },
      approved: false,
      reason: 'Open codex-app-server provider routing from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-setup-open-codex-app-server',
      path: 'xd.xenesis.providers.setup.open',
      args: { provider: 'codex-app-server', ensureVisible: true },
      approved: false,
      reason: 'Open codex-app-server provider setup from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('LM Studio provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-setup-open-lmstudio',
      path: 'xd.xenesis.providers.setup.open',
      args: { provider: 'lmstudio', ensureVisible: true },
      approved: false,
      reason: 'Open lmstudio provider setup from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Qwen provider profile draft 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-open-qwen',
      path: 'xd.xenesis.providers.profileDrafts.open',
      args: { provider: 'qwen', ensureVisible: true },
      approved: false,
      reason: 'Open qwen provider profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-open-auto',
      path: 'xd.xenesis.providers.profileDrafts.open',
      args: { provider: 'auto', ensureVisible: true },
      approved: false,
      reason: 'Open auto provider profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설치 계획 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-open-notion',
      path: 'xd.xenesis.tools.installPlans.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion tool install plan from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-open-google-calendar',
      path: 'xd.xenesis.tools.setup.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar tool setup from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-open-google-workspace',
      path: 'xd.xenesis.tools.setup.open',
      args: { id: 'google-workspace', ensureVisible: true },
      approved: false,
      reason: 'Open Google Workspace tool setup from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('웹페이지 가져오기 설치 계획 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-open-fetch',
      path: 'xd.xenesis.tools.installPlans.open',
      args: { id: 'fetch', ensureVisible: true },
      approved: false,
      reason: 'Open Fetch tool install plan from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('파일 시스템 connector 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-connector-open-filesystem',
      path: 'xd.xenesis.tools.connectors.open',
      args: { id: 'filesystem', ensureVisible: true },
      approved: false,
      reason: 'Open Filesystem tool connector from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 connector 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-connector-open-notion',
      path: 'xd.xenesis.tools.connectors.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion tool connector from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-open-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion MCP install draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 사용자 스토리 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-user-story-open-google-calendar',
      path: 'xd.xenesis.tools.userStories.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar tool user story from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 액션 정책 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-open-linear',
      path: 'xd.xenesis.tools.actions.open',
      args: { id: 'linear', ensureVisible: true },
      approved: false,
      reason: 'Open Linear tool action policy from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-telegram',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 routing 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-routing-open-telegram',
      path: 'xd.xenesis.channels.routing.open',
      args: { channel: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel routing from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('슬랙 라우팅 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-routing-open-slack',
      path: 'xd.xenesis.channels.routing.open',
      args: { channel: 'slack', ensureVisible: true },
      approved: false,
      reason: 'Open Slack channel routing from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 안전 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-safety-open-telegram',
      path: 'xd.xenesis.channels.safety.open',
      args: { channel: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel safety from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('슬랙 access group 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-open-slack',
      path: 'xd.xenesis.channels.accessGroups.open',
      args: { channel: 'slack', ensureVisible: true },
      approved: false,
      reason: 'Open Slack channel access groups from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('마이크로소프트 팀즈 access group 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-open-microsoft-teams',
      path: 'xd.xenesis.channels.accessGroups.open',
      args: { channel: 'microsoft-teams', ensureVisible: true },
      approved: false,
      reason: 'Open Microsoft Teams channel access groups from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Signal 페어링 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-pairing-open-signal',
      path: 'xd.xenesis.channels.pairing.open',
      args: { channel: 'signal', ensureVisible: true },
      approved: false,
      reason: 'Open Signal channel pairing from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-whatsapp',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'whatsapp', ensureVisible: true },
      approved: false,
      reason: 'Open WhatsApp messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('마이크로소프트 팀즈 설정 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-microsoft-teams',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'microsoft-teams', ensureVisible: true },
      approved: false,
      reason: 'Open Microsoft Teams messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 프로필 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-open-google-chat',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { channel: 'google-chat', ensureVisible: true },
      approved: false,
      reason: 'Open Google Chat channel profile draft from natural language request.',
    },
  ]);

  for (const [prompt, id, label] of [
    ['아이메시지 setup 열어줘', 'imessage', 'iMessage'],
    ['매트릭스 setup 열어줘', 'matrix', 'Matrix'],
    ['IRC setup 열어줘', 'irc', 'IRC'],
    ['Mattermost setup 열어줘', 'mattermost', 'Mattermost'],
    ['넥스트클라우드 톡 setup 열어줘', 'nextcloud-talk', 'Nextcloud Talk'],
    ['노스트르 setup 열어줘', 'nostr', 'Nostr'],
    ['Raft setup 열어줘', 'raft', 'Raft'],
    ['Tlon setup 열어줘', 'tlon', 'Tlon'],
    ['시놀로지 챗 setup 열어줘', 'synology-chat', 'Synology Chat'],
    ['로켓챗 setup 열어줘', 'rocket-chat', 'Rocket.Chat'],
    ['트위치 setup 열어줘', 'twitch', 'Twitch'],
    ['LINE setup 열어줘', 'line', 'LINE'],
    ['위챗 setup 열어줘', 'wechat', 'WeChat'],
    ['QQ 봇 setup 열어줘', 'qqbot', 'QQ Bot'],
    ['Lark setup 열어줘', 'feishu', 'Feishu / Lark'],
    ['딩톡 setup 열어줘', 'dingding', 'DingTalk / Dingding'],
    ['위안바오 setup 열어줘', 'yuanbao', 'Yuanbao'],
    ['Zalo setup 열어줘', 'zalo', 'Zalo'],
    ['이메일 setup 열어줘', 'email', 'Email'],
    ['SMS setup 열어줘', 'sms', 'SMS'],
    ['홈 어시스턴트 setup 열어줘', 'home-assistant', 'Home Assistant'],
    ['ntfy setup 열어줘', 'ntfy', 'ntfy'],
  ] as const) {
    assert.deepEqual(planXenesisDeskNaturalLanguageActions(prompt).actions, [
      {
        id: `natural-xenesis-messenger-view-open-${id}`,
        path: 'xd.xenesis.messengers.views.open',
        args: { id, ensureVisible: true },
        approved: false,
        reason: `Open ${label} messenger view from natural language request.`,
      },
    ]);
  }

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 사용자 스토리 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-open-telegram',
      path: 'xd.xenesis.channels.userStories.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel user story from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 채널 프로필 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-open-telegram',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { channel: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Signal channel profile draft 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-open-signal',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { channel: 'signal', ensureVisible: true },
      approved: false,
      reason: 'Open Signal channel profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 진단 runbook 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-open-notion',
      path: 'xd.xenesis.connections.diagnostics.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 setup request 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-open-notion',
      path: 'xd.xenesis.connections.setupRequests.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection setup request from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps Connection Center readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 진단 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Connection diagnostics 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 요청 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-status',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection setup request catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('connection setup request 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-status',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection setup request catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connections-status',
      path: 'xd.xenesis.connections.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Connection Center 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connections-status',
      path: 'xd.xenesis.connections.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 진단 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status-notion',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion connection diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-status-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar OAuth draft status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 라우팅 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-routing-status-telegram',
      path: 'xd.xenesis.channels.routing.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Signal channel profile draft 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-status-signal',
      path: 'xd.xenesis.channels.profileDrafts.status',
      args: { channel: 'signal' },
      approved: false,
      reason: 'Read Signal channel profile draft status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 setup request 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-status-notion',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion connection setup request status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 설정 요청 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-status-telegram',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram connection setup request status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps onboarding checklist readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status',
      path: 'xd.xenesis.onboarding.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis onboarding status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 체크리스트 확인해줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status',
      path: 'xd.xenesis.onboarding.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis onboarding status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('첫 채팅 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-first-chat',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'first-chat' },
      approved: false,
      reason: 'Read First chat onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI MCP 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-local-cli-mcp',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'local-cli-mcp' },
      approved: false,
      reason: 'Read Local CLI and MCP onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('추천 도구 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-recommended-tools',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'recommended-tools' },
      approved: false,
      reason: 'Read Recommended tools onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-gateway',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'gateway' },
      approved: false,
      reason: 'Read Gateway onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('메신저 라우팅 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-messenger-routing',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'messenger-routing' },
      approved: false,
      reason: 'Read Messenger routing onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('엔드투엔드 테스트 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-test-send',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'test-send' },
      approved: false,
      reason: 'Read End-to-end test onboarding checklist status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps guide catalog readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('가이드 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guides-status',
      path: 'xd.xenesis.guides.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('guide catalog 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guides-status',
      path: 'xd.xenesis.guides.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-onboarding-connections',
      path: 'xd.xenesis.guides.status',
      args: { id: 'onboarding-connections' },
      approved: false,
      reason: 'Read Onboarding and connections guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('CR MCP 게이트웨이 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-cr-mcp-gateway-bots',
      path: 'xd.xenesis.guides.status',
      args: { id: 'cr-mcp-gateway-bots' },
      approved: false,
      reason: 'Read Capability Registry, MCP, gateway, and bots guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('사용자 스토리 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-agent-user-stories',
      path: 'xd.xenesis.guides.status',
      args: { id: 'agent-user-stories' },
      approved: false,
      reason: 'Read Agent user stories guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 도구 통합 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-external-tool-integrations',
      path: 'xd.xenesis.guides.status',
      args: { id: 'external-tool-integrations' },
      approved: false,
      reason: 'Read External tool integrations guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Hermes 통합 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-external-tool-integrations',
      path: 'xd.xenesis.guides.status',
      args: { id: 'external-tool-integrations' },
      approved: false,
      reason: 'Read External tool integrations guide catalog status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps detailed Connection Center readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-setup-status',
      path: 'xd.xenesis.providers.setup.status',
      args: {},
      approved: false,
      reason: 'Read AI provider setup catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider routing 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-routing-status',
      path: 'xd.xenesis.providers.routing.status',
      args: {},
      approved: false,
      reason: 'Read AI provider routing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider view 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-views-status',
      path: 'xd.xenesis.providers.views.status',
      args: {},
      approved: false,
      reason: 'Read AI provider view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-profile-drafts-status',
      path: 'xd.xenesis.providers.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read AI provider profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 프로필 초안 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-status',
      path: 'xd.xenesis.channels.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external messenger profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('channel profile draft 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-status',
      path: 'xd.xenesis.channels.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external messenger profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 connector 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-connectors-status',
      path: 'xd.xenesis.tools.connectors.status',
      args: {},
      approved: false,
      reason: 'Read external tool connector catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-setup-status',
      path: 'xd.xenesis.tools.setup.status',
      args: {},
      approved: false,
      reason: 'Read external tool setup catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 view 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-views-status',
      path: 'xd.xenesis.tools.views.status',
      args: {},
      approved: false,
      reason: 'Read external tool view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 설치 계획 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-install-plans-status',
      path: 'xd.xenesis.tools.installPlans.status',
      args: {},
      approved: false,
      reason: 'Read external tool install plan catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 OAuth 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-oauth-drafts-status',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external tool OAuth draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 MCP 설치 초안 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-mcp-install-drafts-status',
      path: 'xd.xenesis.tools.mcpInstallDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external tool MCP install draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 액션 정책 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-actions-status',
      path: 'xd.xenesis.tools.actions.status',
      args: {},
      approved: false,
      reason: 'Read external tool action policy catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 사용자 스토리 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-user-stories-status',
      path: 'xd.xenesis.tools.userStories.status',
      args: {},
      approved: false,
      reason: 'Read external tool user-story catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 라우팅 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-routing-status',
      path: 'xd.xenesis.channels.routing.status',
      args: {},
      approved: false,
      reason: 'Read external messenger routing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 안전 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-safety-status',
      path: 'xd.xenesis.channels.safety.status',
      args: {},
      approved: false,
      reason: 'Read external messenger safety catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 접근 그룹 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-access-groups-status',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: {},
      approved: false,
      reason: 'Read external messenger access-group catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 액세스 그룹 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-access-groups-status',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: {},
      approved: false,
      reason: 'Read external messenger access-group catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 페어링 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-pairing-status',
      path: 'xd.xenesis.channels.pairing.status',
      args: {},
      approved: false,
      reason: 'Read external messenger pairing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 사용자 스토리 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-user-stories-status',
      path: 'xd.xenesis.channels.userStories.status',
      args: {},
      approved: false,
      reason: 'Read external messenger user-story catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-views-status',
      path: 'xd.xenesis.messengers.views.status',
      args: {},
      approved: false,
      reason: 'Read external messenger view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-setup-status-auto',
      path: 'xd.xenesis.providers.setup.status',
      args: { provider: 'auto' },
      approved: false,
      reason: 'Read auto provider setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider routing 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-routing-status-codex-app-server',
      path: 'xd.xenesis.providers.routing.status',
      args: { provider: 'codex-app-server' },
      approved: false,
      reason: 'Read codex-app-server provider routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Azure OpenAI provider routing 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-routing-status-azure',
      path: 'xd.xenesis.providers.routing.status',
      args: { provider: 'azure' },
      approved: false,
      reason: 'Read azure provider routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 connector 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-connector-status-notion',
      path: 'xd.xenesis.tools.connectors.status',
      args: { tool: 'notion' },
      approved: false,
      reason: 'Read Notion tool connector status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-google-calendar',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Google Drive OAuth 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-status-google-workspace',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: { id: 'google-workspace' },
      approved: false,
      reason: 'Read Google Workspace OAuth draft status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 독스 액션 정책 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-status-google-workspace',
      path: 'xd.xenesis.tools.actions.status',
      args: { tool: 'google-workspace' },
      approved: false,
      reason: 'Read Google Workspace tool action policy status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설정 확인해줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-notion',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 config 확인해줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-linear',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'linear' },
      approved: false,
      reason: 'Read Linear tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설치 계획 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-status-notion',
      path: 'xd.xenesis.tools.installPlans.status',
      args: { tool: 'notion' },
      approved: false,
      reason: 'Read Notion tool install plan status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-user-story-status-google-calendar',
      path: 'xd.xenesis.tools.userStories.status',
      args: { tool: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar tool user story status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 접근 그룹 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-status-telegram',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel access groups status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('디스코드 액세스 그룹 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-status-discord',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: { channel: 'discord' },
      approved: false,
      reason: 'Read Discord channel access groups status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 페어링 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-pairing-status-telegram',
      path: 'xd.xenesis.channels.pairing.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel pairing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-telegram',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-google-chat',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'google-chat' },
      approved: false,
      reason: 'Read Google Chat messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 라우팅 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-routing-status-google-chat',
      path: 'xd.xenesis.channels.routing.status',
      args: { channel: 'google-chat' },
      approved: false,
      reason: 'Read Google Chat channel routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 안전 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-safety-status-whatsapp',
      path: 'xd.xenesis.channels.safety.status',
      args: { channel: 'whatsapp' },
      approved: false,
      reason: 'Read WhatsApp channel safety status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('ntfy setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-ntfy',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'ntfy' },
      approved: false,
      reason: 'Read ntfy messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('딩딩 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-dingding',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'dingding' },
      approved: false,
      reason: 'Read DingTalk / Dingding messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('슬랙 config 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-slack',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'slack' },
      approved: false,
      reason: 'Read Slack messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('라크 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-status-feishu',
      path: 'xd.xenesis.channels.userStories.status',
      args: { id: 'feishu' },
      approved: false,
      reason: 'Read Feishu / Lark channel user story status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('SMS 페어링 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-pairing-status-sms',
      path: 'xd.xenesis.channels.pairing.status',
      args: { channel: 'sms' },
      approved: false,
      reason: 'Read SMS channel pairing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-status-telegram',
      path: 'xd.xenesis.channels.userStories.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel user story status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps Connection Center review requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-notion',
      path: 'xd.xenesis.connections.setupRequests.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion connection setup review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결해줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-notion',
      path: 'xd.xenesis.connections.setupRequests.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion connection setup review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-request-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion MCP install draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치해줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-request-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion MCP install draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설치 계획 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-request-notion',
      path: 'xd.xenesis.tools.installPlans.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion tool install plan review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-request-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.request',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Request Google Calendar OAuth draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 인증해줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-request-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.request',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Request Google Calendar OAuth draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 OAuth 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-request-google-workspace',
      path: 'xd.xenesis.tools.oauthDrafts.request',
      args: { id: 'google-workspace' },
      approved: false,
      reason: 'Request Google Workspace OAuth draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 액션 정책 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-request-linear',
      path: 'xd.xenesis.tools.actions.request',
      args: { id: 'linear' },
      approved: false,
      reason: 'Request Linear tool action policy review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 채널 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-request-telegram',
      path: 'xd.xenesis.channels.profileDrafts.request',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Request Telegram channel profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-request-whatsapp',
      path: 'xd.xenesis.channels.profileDrafts.request',
      args: { channel: 'whatsapp' },
      approved: false,
      reason: 'Request WhatsApp channel profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Zalo 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-request-zalo',
      path: 'xd.xenesis.channels.profileDrafts.request',
      args: { channel: 'zalo' },
      approved: false,
      reason: 'Request Zalo channel profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-request-auto',
      path: 'xd.xenesis.providers.profileDrafts.request',
      args: { provider: 'auto' },
      approved: false,
      reason: 'Request AI provider profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider 설정해줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-request-auto',
      path: 'xd.xenesis.providers.profileDrafts.request',
      args: { provider: 'auto' },
      approved: false,
      reason: 'Request AI provider profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Claude interactive provider profile 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-request-claude-interactive',
      path: 'xd.xenesis.providers.profileDrafts.request',
      args: { provider: 'claude-interactive' },
      approved: false,
      reason: 'Request claude-interactive provider profile draft review from natural language request.',
    },
  ]);
});

test('buildXenesisDeskControlPromptHint describes settings files capture and layout control', () => {
  const hint = buildXenesisDeskControlPromptHint();

  assert.match(hint, /xd\.panes\.settings\.open/);
  assert.match(hint, /xd\.files\.listOpen/);
  assert.match(hint, /xd\.files\.open/);
  assert.match(hint, /xd\.capture\.activePane/);
  assert.match(hint, /xd\.dock\.arrangeGrid/);
  assert.match(hint, /xd\.tools\.core\.capabilityExplorer\.open/);
  assert.match(hint, /xd\.terminals\.runMany/);
  assert.match(hint, /xd\.dock\.sizes\.set/);
  assert.match(hint, /xd\.dock\.window\.arrange/);
  assert.match(hint, /xd\.dock\.pane\.arrange/);
  assert.match(hint, /xd\.tools\.core\.networkMonitor\.open/);
});
