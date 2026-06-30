import type { ToolGuardConfig } from '../config/index.js';
import type { SessionLogRecord } from '../sessions/index.js';
import type { ToolExecutionPolicy } from './AgentRunner.js';
import type { AgentMessage } from './messages.js';

export type AgentCapabilityId =
  | 'real_world_benchmark'
  | 'self_check_loop'
  | 'file_edit_workflow'
  | 'context_memory_session'
  | 'subagent_background'
  | 'provider_quality'
  | 'channel_operations'
  | 'desk_capability_contract';

export interface AgentCapabilityDefinition {
  id: AgentCapabilityId;
  title: string;
  objective: string;
  successSignals: string[];
  riskSignals: string[];
  preferredTools: string[];
}

export type AgentBenchmarkScenarioId =
  | 'workspace_analysis'
  | 'safe_file_change'
  | 'verify_fix'
  | 'long_running_handoff'
  | 'desk_context_operation'
  | 'current_information'
  | 'provider_recovery'
  | 'channel_delivery';

export interface AgentBenchmarkScenario {
  id: AgentBenchmarkScenarioId;
  promptSignals: string[];
  successSignals: string[];
  preferredTools: string[];
  requiredCapabilities: AgentCapabilityId[];
}

export interface ClassifiedAgentScenario {
  scenarioId: AgentBenchmarkScenarioId;
  capabilityIds: AgentCapabilityId[];
  preferredTools: string[];
}

export interface AgentSelfCheckStep {
  id: 'classify' | 'inspect' | 'plan' | 'execute' | 'verify' | 'repair_once' | 'report';
  purpose: string;
  requiredWhen: string;
}

export interface AgentSelfCheckLoop {
  steps: AgentSelfCheckStep[];
  stopConditions: string[];
  requiredEvidence: string[];
}

export interface FileWorkflowPolicy {
  inspectTools: string[];
  editTools: string[];
  shellUse: string;
  afterChangeEvidence: string[];
}

export interface ContextArbitrationPolicy {
  priorityOrder: string[];
  staleContextRule: string;
  memoryRule: string;
  sessionRule: string;
  backgroundTaskRule: string;
}

export interface SubagentRoutingPolicy {
  roles: Record<
    string,
    {
      approvalMode: 'readonly' | 'safe';
      useWhen: string[];
      preferredTools: string[];
    }
  >;
  handoffFirstSignals: string[];
  reinjectResults: string;
}

export interface ProviderQualityMetrics {
  retryCount: number;
  fallbackCount: number;
  contextRecoveryCount: number;
  recovered: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  providers: string[];
  recommendations: string[];
}

export interface ChannelOperationPolicy {
  supportedChannels: string[];
  requiredTraceFields: string[];
  secretPolicy: string;
  blockedWhen: string[];
  responsePolicy: string;
}

export interface DeskCapabilityContract {
  contextTools: string[];
  controlTools: string[];
  verifyAfterControl: string[];
  gatewayRole: string;
  staleContextPolicy: string;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function mergeRequiredMaps(...maps: Array<Record<string, string[]> | undefined>) {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [tool, required] of Object.entries(map ?? {})) {
      merged[tool] = unique([...(merged[tool] ?? []), ...required]);
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeGuardRequiredMaps(...maps: Array<Record<string, string[]> | undefined>) {
  return mergeRequiredMaps(...maps) ?? {};
}

function hasRequiredMapEntries(map: Record<string, string[]> | undefined) {
  return Object.values(map ?? {}).some((required) => required.length > 0);
}

export function mergeToolExecutionPolicies(
  ...policies: Array<ToolExecutionPolicy | undefined>
): ToolExecutionPolicy | undefined {
  const active = policies.filter((policy): policy is ToolExecutionPolicy => policy !== undefined);
  if (active.length === 0) return undefined;
  const priorityTools = unique(active.flatMap((policy) => policy.priorityTools ?? []));
  const requiredBefore = mergeRequiredMaps(...active.map((policy) => policy.requiredBefore));
  const requiredBeforeAny = mergeRequiredMaps(...active.map((policy) => policy.requiredBeforeAny));
  const snapshotOnly = active.every((policy) => policy.snapshotOnly);
  return {
    name:
      active
        .map((policy) => policy.name)
        .filter(Boolean)
        .join('+') || 'merged',
    ...(priorityTools.length > 0 ? { priorityTools } : {}),
    ...(requiredBefore ? { requiredBefore } : {}),
    ...(requiredBeforeAny ? { requiredBeforeAny } : {}),
    ...(snapshotOnly ? { snapshotOnly: true } : {}),
    ...(active.find((policy) => policy.handoffPriority)?.handoffPriority
      ? { handoffPriority: active.find((policy) => policy.handoffPriority)!.handoffPriority }
      : {}),
  };
}

export function mergeToolGuardConfigs(base: ToolGuardConfig, override?: Partial<ToolGuardConfig>): ToolGuardConfig {
  if (!override)
    return {
      enabled: base.enabled,
      useDefault: base.useDefault,
      priorityTools: [...base.priorityTools],
      requiredBefore: { ...base.requiredBefore },
      requiredBeforeAny: { ...base.requiredBeforeAny },
    };
  return {
    enabled: override.enabled ?? base.enabled,
    useDefault: override.useDefault ?? base.useDefault,
    priorityTools: unique([...(base.priorityTools ?? []), ...(override.priorityTools ?? [])]),
    requiredBefore: mergeGuardRequiredMaps(base.requiredBefore, override.requiredBefore),
    requiredBeforeAny: mergeGuardRequiredMaps(base.requiredBeforeAny, override.requiredBeforeAny),
  };
}

export function hasCustomToolGuardConfig(guard: ToolGuardConfig) {
  return (
    guard.enabled === false ||
    guard.useDefault === false ||
    guard.priorityTools.length > 0 ||
    hasRequiredMapEntries(guard.requiredBefore) ||
    hasRequiredMapEntries(guard.requiredBeforeAny)
  );
}

function createCustomGuardToolExecutionPolicy(guard: ToolGuardConfig): ToolExecutionPolicy | undefined {
  const hasPriority = guard.priorityTools.length > 0;
  const hasRequiredBefore = hasRequiredMapEntries(guard.requiredBefore);
  const hasRequiredBeforeAny = hasRequiredMapEntries(guard.requiredBeforeAny);
  if (!hasPriority && !hasRequiredBefore && !hasRequiredBeforeAny) return undefined;
  return {
    name: 'xenesis:config-guard',
    ...(hasPriority ? { priorityTools: guard.priorityTools } : {}),
    ...(hasRequiredBefore ? { requiredBefore: guard.requiredBefore } : {}),
    ...(hasRequiredBeforeAny ? { requiredBeforeAny: guard.requiredBeforeAny } : {}),
  };
}

export function createConfiguredCapabilityGuardToolExecutionPolicy(
  guard: ToolGuardConfig,
): ToolExecutionPolicy | undefined {
  if (!guard.enabled) return undefined;
  return mergeToolExecutionPolicies(
    guard.useDefault ? createCapabilityGuardToolExecutionPolicy() : undefined,
    createCustomGuardToolExecutionPolicy(guard),
  );
}

export function createCapabilityGuardToolExecutionPolicy(): ToolExecutionPolicy {
  return {
    name: 'xenesis:capability-guard',
    priorityTools: [
      'tree',
      'glob',
      'list',
      'read',
      'search',
      'code_symbols',
      'lsp',
      'diagnostics',
      'app_launch_plan',
      'app_readiness',
      'app_e2e_check',
      'weather_current',
      'weather_forecast',
      'market_quote',
      'sports_scores',
      'news_latest',
      'web_fetch',
      'desk_state',
      'desk_active_context',
      'desk_context_actions',
      'desk_capabilities',
      'agent_task',
      'todo',
    ],
    requiredBefore: {
      patch: ['read'],
      json: ['read'],
      desk_terminal_stop: ['desk_terminal_tail'],
    },
    requiredBeforeAny: {
      write: ['read', 'list'],
      shell: ['diagnostics', 'search', 'read', 'list'],
      desk_call_capability: ['desk_capabilities', 'desk_state', 'desk_active_context'],
      desk_terminal_run: ['desk_state', 'desk_terminal_tail'],
      task_handoff: ['agent_task', 'todo'],
    },
  };
}

export function buildAgentCapabilityChecklist(): AgentCapabilityDefinition[] {
  return [
    {
      id: 'real_world_benchmark',
      title: 'Real-world benchmark',
      objective:
        'Exercise representative workspace, edit, verification, Desk, current-info, provider, and channel tasks.',
      successSignals: ['scenario_id_recorded', 'required_tools_used', 'result_grounded_in_evidence'],
      riskSignals: ['generic_answer', 'link_only_answer', 'missing_workspace_verification'],
      preferredTools: [
        'scenario',
        'smoke',
        'run_reports',
        'tree',
        'glob',
        'list',
        'read',
        'search',
        'code_symbols',
        'lsp',
        'diagnostics',
        'app_launch_plan',
        'app_readiness',
        'app_e2e_check',
        'weather_current',
        'weather_forecast',
        'market_quote',
        'sports_scores',
        'news_latest',
        'web_fetch',
        'desk_state',
        'desk_active_context',
        'desk_context_actions',
        'desk_capabilities',
        'agent_task',
        'todo',
      ],
    },
    {
      id: 'self_check_loop',
      title: 'Self-check loop',
      objective: 'Separate classify, inspect, plan, execute, verify, repair, and report decisions.',
      successSignals: ['decision_trace_present', 'verification_evidence_present', 'clear_stop_reason'],
      riskSignals: ['skipped_inspection', 'unbounded_repair', 'missing_final_evidence'],
      preferredTools: [
        'todo',
        'diagnostics',
        'run_reports',
        'tree',
        'glob',
        'list',
        'read',
        'search',
        'code_symbols',
        'lsp',
        'diff',
        'patch',
        'json',
      ],
    },
    {
      id: 'file_edit_workflow',
      title: 'File edit workflow',
      objective: 'Use structured inspection and minimal patches before verification.',
      successSignals: ['read_before_patch', 'diff_or_patch_recorded', 'focused_verification_result'],
      riskSignals: ['shell_first_code_search', 'broad_rewrite', 'no_test_after_change'],
      preferredTools: [
        'tree',
        'glob',
        'list',
        'read',
        'search',
        'code_symbols',
        'lsp',
        'diff',
        'patch',
        'json',
        'diagnostics',
        'app_launch_plan',
        'app_readiness',
        'app_e2e_check',
      ],
    },
    {
      id: 'context_memory_session',
      title: 'Context, memory, and session',
      objective: 'Choose the freshest relevant context and inject durable memory only when useful.',
      successSignals: ['context_sources_reported', 'live_context_preferred', 'memory_used_for_durable_facts'],
      riskSignals: ['stale_session_over_live_context', 'memory_as_scratchpad', 'missing_background_result'],
      preferredTools: [
        'desk_state',
        'desk_active_context',
        'desk_context_actions',
        'workspace_context',
        'memory',
        'agent_task',
      ],
    },
    {
      id: 'subagent_background',
      title: 'Subagent and background tasks',
      objective: 'Route broad or staged work through researcher, implementer, verifier, and durable handoffs.',
      successSignals: ['handoff_dependencies_set', 'completed_task_results_reinjected', 'duplicate_handoff_avoided'],
      riskSignals: ['single_turn_overload', 'duplicate_background_tasks', 'ignored_blocked_task'],
      preferredTools: ['todo', 'agent_task', 'task_handoff'],
    },
    {
      id: 'provider_quality',
      title: 'Provider quality',
      objective: 'Track retry, fallback, context recovery, and provider-specific degradation.',
      successSignals: ['retry_count_reported', 'fallback_count_reported', 'context_recovery_reported'],
      riskSignals: ['hidden_provider_failure', 'unexplained_fallback', 'quality_not_rechecked_after_fallback'],
      preferredTools: ['run_reports', 'connect', 'provider-live', 'news_latest', 'web_fetch'],
    },
    {
      id: 'channel_operations',
      title: 'Channel operations',
      objective: 'Operate Telegram, Slack, Discord, and webhook channels with traceability and secret safety.',
      successSignals: ['trace_id_present', 'session_id_present', 'allowlist_checked'],
      riskSignals: ['secret_echoed', 'missing_allowlist', 'blind_delivery'],
      preferredTools: ['channels', 'channel_diagnostics', 'desk_state'],
    },
    {
      id: 'desk_capability_contract',
      title: 'Desk capability contract',
      objective: 'Use embedded Desk context and capabilities directly, with gateway only as an external boundary.',
      successSignals: ['desk_context_injected', 'desk_action_verified', 'bridge_fallback_diagnosed'],
      riskSignals: ['wrong_workspace', 'unverified_desk_control', 'gateway_required_for_embedded_run'],
      preferredTools: [
        'desk_state',
        'desk_active_context',
        'desk_context_actions',
        'desk_call_capability',
        'desk_recent_diagnostics',
        'desk_capabilities',
      ],
    },
  ];
}

export function buildAgentBenchmarkScenarios(): AgentBenchmarkScenario[] {
  return [
    {
      id: 'workspace_analysis',
      promptSignals: ['analyze', 'inspect', 'structure', '분석', '구조', '폴더'],
      successSignals: ['workspace_root_checked', 'tree_or_glob_used', 'summary_has_file_evidence'],
      preferredTools: ['tree', 'glob', 'list', 'read', 'code_symbols'],
      requiredCapabilities: ['real_world_benchmark', 'context_memory_session'],
    },
    {
      id: 'safe_file_change',
      promptSignals: ['edit', 'change', 'modify', '수정', '변경'],
      successSignals: ['read_before_patch', 'diff_or_patch_recorded', 'focused_verification_result'],
      preferredTools: ['read', 'search', 'diff', 'patch', 'diagnostics'],
      requiredCapabilities: ['file_edit_workflow', 'self_check_loop'],
    },
    {
      id: 'verify_fix',
      promptSignals: ['test', 'verify', 'fix', 'error', '테스트', '검증', '에러'],
      successSignals: ['failing_evidence_captured', 'repair_attempt_limited', 'verification_rerun'],
      preferredTools: ['diagnostics', 'read', 'search', 'patch'],
      requiredCapabilities: ['self_check_loop', 'file_edit_workflow'],
    },
    {
      id: 'long_running_handoff',
      promptSignals: ['all', 'batch', 'migration', '전체', '일괄', '끝까지', '마이그레이션'],
      successSignals: ['todo_created', 'handoff_dependencies_set', 'task_results_reinjected'],
      preferredTools: ['todo', 'task_handoff', 'agent_task'],
      requiredCapabilities: ['subagent_background', 'self_check_loop'],
    },
    {
      id: 'desk_context_operation',
      promptSignals: ['desk', 'pane', 'active', 'selected', 'XD', '현재 화면', '선택'],
      successSignals: ['desk_active_context_used', 'desk_state_verified', 'workspace_matches_explorer'],
      preferredTools: ['desk_state', 'desk_active_context', 'desk_context_actions'],
      requiredCapabilities: ['desk_capability_contract', 'context_memory_session'],
    },
    {
      id: 'current_information',
      promptSignals: [
        'weather',
        'news',
        'stock',
        'market',
        'index',
        'sports',
        '날씨',
        '뉴스',
        '주식',
        '증시',
        '시장 현황',
        '코스피',
        '코스닥',
        '스포츠',
      ],
      successSignals: ['specialized_tool_used', 'date_location_source_reported', 'no_link_only_answer'],
      preferredTools: ['weather_current', 'weather_forecast', 'market_quote', 'sports_scores', 'news_latest'],
      requiredCapabilities: ['real_world_benchmark', 'provider_quality'],
    },
    {
      id: 'provider_recovery',
      promptSignals: ['provider', 'fallback', 'retry', 'model', '프로바이더', '모델'],
      successSignals: ['retry_count_reported', 'fallback_quality_checked', 'context_recovery_reported'],
      preferredTools: ['connect', 'run_reports'],
      requiredCapabilities: ['provider_quality'],
    },
    {
      id: 'channel_delivery',
      promptSignals: ['telegram', 'slack', 'discord', 'webhook', '텔레그램', '슬랙', '디스코드'],
      successSignals: ['channel_ready_checked', 'trace_id_present', 'secret_not_echoed'],
      preferredTools: ['channels', 'channel_diagnostics'],
      requiredCapabilities: ['channel_operations'],
    },
  ];
}

export function classifyAgentScenario(prompt: string): ClassifiedAgentScenario {
  const normalized = prompt.toLowerCase();
  const scenarios = buildAgentBenchmarkScenarios();
  const matched =
    scenarios.find((scenario) => scenario.promptSignals.some((signal) => normalized.includes(signal.toLowerCase()))) ??
    scenarios[0];
  return {
    scenarioId: matched.id,
    capabilityIds: matched.requiredCapabilities,
    preferredTools: matched.preferredTools,
  };
}

export function buildAgentSelfCheckLoop(
  input: { fileChangesExpected?: boolean; verificationAvailable?: boolean } = {},
): AgentSelfCheckLoop {
  const steps: AgentSelfCheckStep[] = [
    { id: 'classify', purpose: 'classify user intent and risk', requiredWhen: 'every request' },
    { id: 'inspect', purpose: 'collect current workspace or Desk evidence', requiredWhen: 'before claims or changes' },
    { id: 'plan', purpose: 'choose the smallest next action', requiredWhen: 'non-trivial work' },
    { id: 'execute', purpose: 'run the selected tool or patch', requiredWhen: 'work mode' },
    {
      id: 'verify',
      purpose: 'run focused checks or inspect result state',
      requiredWhen: input.verificationAvailable ? 'available' : 'when evidence exists',
    },
    {
      id: 'repair_once',
      purpose: 'repair from concrete failure evidence',
      requiredWhen: input.fileChangesExpected ? 'after failed verification' : 'only when safe',
    },
    { id: 'report', purpose: 'summarize evidence, changes, and next action', requiredWhen: 'every terminal response' },
  ];
  return {
    steps,
    stopConditions: [
      'same_failure_signature_repeated',
      'verification_failure_signature_repeated_after_repair',
      'max_repair_attempts_reached',
      'approval_denied',
      'architectural_decision_required',
      'required_context_missing',
    ],
    requiredEvidence: [
      'intent_or_scenario',
      'tools_used',
      'workspace_or_desk_context_source',
      'context_freshness_decision',
      ...(input.verificationAvailable ? ['verification_command_and_result'] : []),
      'final_status',
    ],
  };
}

export function buildFileWorkflowPolicy(): FileWorkflowPolicy {
  return {
    inspectTools: ['tree', 'glob', 'list', 'read', 'search', 'code_symbols', 'lsp'],
    editTools: ['diff', 'patch', 'json'],
    shellUse: 'only_when_structured_tools_cannot_answer_or_command_is_requested',
    afterChangeEvidence: ['changed_paths', 'diff_or_patch_summary', 'focused_verification_result'],
  };
}

export function buildContextArbitrationPolicy(): ContextArbitrationPolicy {
  return {
    priorityOrder: [
      'explicit_user_path',
      'live_desk_or_ide_context',
      'workspace_context_index',
      'background_task_result',
      'session_history',
      'durable_memory',
    ],
    staleContextRule: 'recheck_live_context_when_current_or_selected_is_requested',
    memoryRule: 'durable_preferences_project_facts_and_reusable_decisions_only',
    sessionRule: 'conversation_continuity_not_workspace_truth',
    backgroundTaskRule: 'inject_completed_task_results_before_new_work',
  };
}

export function buildSubagentRoutingPolicy(): SubagentRoutingPolicy {
  return {
    roles: {
      researcher: {
        approvalMode: 'readonly',
        useWhen: ['broad_project_sweep', 'unknown_code_area', 'parallel_research'],
        preferredTools: ['tree', 'glob', 'list', 'read', 'search', 'code_symbols', 'lsp'],
      },
      implementer: {
        approvalMode: 'safe',
        useWhen: ['scoped_patch', 'mechanical_change', 'planned_edit'],
        preferredTools: ['read', 'search', 'diff', 'patch', 'json', 'diagnostics'],
      },
      verifier: {
        approvalMode: 'readonly',
        useWhen: ['independent_check', 'verify_fix', 'regression_scan'],
        preferredTools: ['diagnostics', 'read', 'search', 'shell'],
      },
    },
    handoffFirstSignals: ['전체', '일괄', '끝까지', '마이그레이션', 'whole project', 'batch', 'all files'],
    reinjectResults: 'inject_completed_task_results_before_new_work',
  };
}

export function buildProviderQualityMetrics(records: SessionLogRecord[]): ProviderQualityMetrics {
  const retries = records.filter((record) => record.type === 'provider_retry');
  const fallbacks = records.filter((record) => record.type === 'provider_fallback');
  const contextRecoveries = records.filter((record) => record.type === 'context_recovery');
  const retryProviders = retries.map((record) => (record.type === 'provider_retry' ? record.provider : ''));
  const fallbackProviders = fallbacks.flatMap((record) =>
    record.type === 'provider_fallback' ? [record.from, record.to] : [],
  );
  const riskLevel =
    fallbacks.length > 1 || retries.length >= 3 || contextRecoveries.length > 1
      ? 'high'
      : retries.length > 0 || fallbacks.length > 0 || contextRecoveries.length > 0
        ? 'medium'
        : 'low';
  const recommendations = [
    retries.length > 0 ? 'monitor_provider_retry_rate' : undefined,
    fallbacks.length > 0 ? 'confirm_fallback_answer_quality' : undefined,
    contextRecoveries.length > 0 ? 'review_context_compaction_thresholds' : undefined,
  ].filter((item): item is string => Boolean(item));
  return {
    retryCount: retries.length,
    fallbackCount: fallbacks.length,
    contextRecoveryCount: contextRecoveries.length,
    recovered: fallbacks.length > 0 || contextRecoveries.length > 0,
    riskLevel,
    providers: unique([...retryProviders, ...fallbackProviders]),
    recommendations,
  };
}

export function buildChannelOperationPolicy(): ChannelOperationPolicy {
  return {
    supportedChannels: ['telegram', 'slack', 'discord', 'webhook'],
    requiredTraceFields: ['traceId', 'sessionId'],
    secretPolicy: 'never_echo_tokens_signing_secrets_or_webhook_urls',
    blockedWhen: ['missing_token_env', 'missing_signing_secret', 'missing_allowlist', 'approval_required'],
    responsePolicy: 'preserve_conversation_session_and_report_trace',
  };
}

export function buildDeskCapabilityContract(): DeskCapabilityContract {
  return {
    contextTools: ['desk_state', 'desk_active_context', 'desk_context_actions'],
    controlTools: ['desk_call_capability', 'desk_safe_file_preview', 'desk_safe_file_apply', 'desk_terminal_run'],
    verifyAfterControl: ['desk_state', 'desk_active_context', 'desk_recent_diagnostics'],
    gatewayRole: 'external_integration_boundary_not_required_for_embedded_runs',
    staleContextPolicy: 'refresh_active_context_when_explorer_or_pane_selection_changes',
  };
}

export function createAgentCapabilityPolicySystemMessage(): Extract<AgentMessage, { role: 'system' }> {
  const checklist = buildAgentCapabilityChecklist();
  return {
    role: 'system',
    content: [
      'Xenesis agent capability policy:',
      ...checklist.map(
        (item, index) =>
          `${index + 1}. ${item.title}: ${item.objective} Success signals: ${item.successSignals.join(', ')}.`,
      ),
      'Apply these policies in order when they are relevant, and record decisions through context sources, tool policy audits, task handoffs, verification results, and run reports.',
    ].join('\n'),
  };
}
