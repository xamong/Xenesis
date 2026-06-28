import {
  listRecommendedMcpServers,
  type RecommendedMcpServer,
} from '../../packages/xenesis/src/extensions/recommendedMcpServers';
import type {
  AiProviderSettings,
  McpSettingsStatus,
  ProviderIntegrationStatus,
  XenesisGatewayChannelName,
  XenesisProfileChannelName,
  XenesisStatus,
} from './types';

export type XenesisConnectionKind =
  | 'onboarding'
  | 'provider'
  | 'local-cli'
  | 'mcp'
  | 'gateway'
  | 'tool'
  | 'messenger'
  | 'guide';
export type XenesisConnectionStatus = 'ready' | 'needs-setup' | 'disabled' | 'blocked' | 'planned' | 'unknown';
export type XenesisConnectionSupportLevel = 'implemented' | 'manual' | 'planned';
export type XenesisConnectionDiagnosticRunbookReadiness =
  | 'ready'
  | 'action-required'
  | 'planned'
  | 'disabled'
  | 'blocked'
  | 'unknown';
export type XenesisConnectionSetupRequestType =
  | 'onboarding-step'
  | 'provider-setup'
  | 'local-cli-setup'
  | 'mcp-setup'
  | 'gateway-setup'
  | 'tool-setup'
  | 'messenger-setup'
  | 'guide-review';

export type XenesisConnectionSetupRequestReviewStatus =
  | 'not-requested'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'expired';

export interface XenesisConnectionSetupRequestReview {
  status: XenesisConnectionSetupRequestReviewStatus;
  approvalSessionKey: string;
  actionInboxItemId?: string;
  requester?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  resolvedAt?: string;
  result?: string;
  error?: string;
}

export interface XenesisConnectionSetupRequestReviewInput {
  id?: string;
  kind?: string;
  title?: string;
  approvalSessionKey?: string;
  requester?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  resolvedAt?: string;
  result?: string;
  error?: string;
}

export interface XenesisConnectionSettingsAction {
  category: string;
  mode?: string;
  section?: string;
}

export const XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES = [
  'diagnostic-runbook',
  'setup-request',
  'onboarding-plan',
  'guide-catalog',
  'provider-profile-draft',
  'provider-setup',
  'provider-setup-plan',
  'provider-routing',
  'provider-view',
  'tool-setup',
  'tool-setup-plan',
  'tool-install-plan',
  'mcp-install-draft',
  'tool-oauth-draft',
  'tool-action-catalog',
  'tool-connector',
  'tool-view',
  'tool-user-story',
  'messenger-view',
  'channel-setup-plan',
  'mcp-template',
  'channel-profile-draft',
  'channel-template',
  'channel-routing',
  'channel-safety',
  'channel-access-groups',
  'channel-pairing',
  'channel-user-story',
] as const;

export type XenesisConnectionCenterDetailFocus = (typeof XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES)[number];

export function isXenesisConnectionCenterDetailFocus(value: string): value is XenesisConnectionCenterDetailFocus {
  return (XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES as readonly string[]).includes(value);
}

export const XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS = [
  'connection-card',
  'setup',
  'connector',
  'setup-plan',
  'install-plan',
  'mcp-template',
  'oauth-draft',
  'action-policy',
  'user-stories',
] as const;

export type XenesisConnectionToolViewSectionId = (typeof XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS)[number];

export const XENESIS_CONNECTION_TOOL_VIEW_SECTION_DETAIL_FOCUS = {
  'connection-card': 'tool-view',
  setup: 'tool-setup',
  connector: 'tool-connector',
  'setup-plan': 'tool-setup-plan',
  'install-plan': 'tool-install-plan',
  'mcp-template': 'mcp-install-draft',
  'oauth-draft': 'tool-oauth-draft',
  'action-policy': 'tool-action-catalog',
  'user-stories': 'tool-user-story',
} as const satisfies Record<XenesisConnectionToolViewSectionId, XenesisConnectionCenterDetailFocus>;

export function isXenesisConnectionToolViewSectionId(value: string): value is XenesisConnectionToolViewSectionId {
  return (XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS as readonly string[]).includes(value);
}

export function xenesisToolViewSectionDetailFocus(
  section: string | undefined,
): XenesisConnectionCenterDetailFocus | null {
  if (!section || !isXenesisConnectionToolViewSectionId(section)) return null;
  return XENESIS_CONNECTION_TOOL_VIEW_SECTION_DETAIL_FOCUS[section];
}

export interface XenesisConnectionCenterOpenArgs extends XenesisConnectionSettingsAction {
  kind: 'settings';
  ensureVisible: boolean;
  focusConnectionId?: string;
  focusConnectionDetail?: XenesisConnectionCenterDetailFocus;
}

export const XENESIS_CONNECTION_CENTER_SETTINGS_ACTION = {
  category: 'xenesis-agent',
  mode: 'connections',
  section: 'xenesis-connections',
} as const satisfies XenesisConnectionSettingsAction;

export const XENESIS_CONNECTION_CENTER_ROOT_SELECTOR = `[data-settings-section="${XENESIS_CONNECTION_CENTER_SETTINGS_ACTION.section}"]`;

export function buildXenesisConnectionCenterOpenArgs(
  input: {
    ensureVisible?: boolean;
    focusConnectionId?: string;
    focusConnectionDetail?: XenesisConnectionCenterDetailFocus;
  } = {},
): XenesisConnectionCenterOpenArgs {
  return {
    kind: 'settings',
    ...XENESIS_CONNECTION_CENTER_SETTINGS_ACTION,
    ensureVisible: input.ensureVisible !== false,
    ...(input.focusConnectionId ? { focusConnectionId: input.focusConnectionId } : {}),
    ...(input.focusConnectionDetail ? { focusConnectionDetail: input.focusConnectionDetail } : {}),
  };
}

export const XENESIS_CONNECTION_PROVIDER_SETTINGS_ACTION = {
  category: 'run-model',
  section: 'default',
} as const satisfies XenesisConnectionSettingsAction;

export const XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION = {
  category: 'run-model',
  mode: 'local',
  section: 'local-cli',
} as const satisfies XenesisConnectionSettingsAction;

export const XENESIS_CONNECTION_GATEWAY_SETTINGS_ACTION = {
  category: 'xenesis-agent',
  mode: 'gateway',
  section: 'gateway',
} as const satisfies XenesisConnectionSettingsAction;

export const XENESIS_CONNECTION_EXTERNAL_BOTS_SETTINGS_ACTION = {
  category: 'xenesis-agent',
  mode: 'external-bots',
  section: 'external-bots',
} as const satisfies XenesisConnectionSettingsAction;

export interface XenesisConnectionSourceDoc {
  label: string;
  url: string;
}

export interface XenesisConnectionMcpConfigSnippets {
  json: string;
  codexToml: string;
}

export interface XenesisConnectionMcpTemplate {
  serverName: string;
  displayName: string;
  description: string;
  transport: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  auth?: 'oauth' | 'none';
  requiredEnv: string[];
  defaultEnabledTools?: string[];
  configSnippets: XenesisConnectionMcpConfigSnippets;
}

export type XenesisConnectionMcpInstallDraftStatus = 'ready' | 'missing-env' | 'planned';

export interface XenesisConnectionMcpInstallDraftTemplate {
  draftStatus: XenesisConnectionMcpInstallDraftStatus;
  actionInboxKind: 'xenesis-mcp-install-draft';
  serverName?: string;
  displayName: string;
  description?: string;
  transport?: 'stdio' | 'http' | 'sse';
  auth?: 'oauth' | 'none';
  installSurface: string;
  reviewSurface: string;
  configTargets: string[];
  requiredEnv: string[];
  missingEnv: string[];
  installSteps: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
  configSnippets?: XenesisConnectionMcpConfigSnippets;
}

export type XenesisConnectionOnboardingPlanPhase =
  | 'first-chat'
  | 'local-runtime'
  | 'external-tools'
  | 'gateway'
  | 'messenger-routing'
  | 'end-to-end-test';

export type XenesisConnectionOnboardingGuidedStepKind = 'read' | 'open' | 'control';

export interface XenesisConnectionOnboardingGuidedStep {
  id: string;
  label: string;
  kind: XenesisConnectionOnboardingGuidedStepKind;
  crPath: string;
  args?: Record<string, unknown>;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionOnboardingPlanTemplate {
  phase: XenesisConnectionOnboardingPlanPhase;
  primarySurface: string;
  setupSurface: string;
  statusReadPaths: string[];
  controlPaths: string[];
  validationChecks: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
  guidedSteps: XenesisConnectionOnboardingGuidedStep[];
}

export type XenesisConnectionToolSetupPlanRuntimeSupport = 'ready-template' | 'planned-oauth' | 'ready-local';
export type XenesisConnectionToolSetupPlanStepKind = 'read' | 'open' | 'request' | 'apply';

export interface XenesisConnectionToolSetupPlanStep {
  id: string;
  label: string;
  kind: XenesisConnectionToolSetupPlanStepKind;
  crPath: string;
  args?: Record<string, unknown>;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionToolSetupPlanTemplate {
  planStatus: XenesisConnectionDiagnosticRunbookReadiness;
  runtimeSupport: XenesisConnectionToolSetupPlanRuntimeSupport;
  guideId: 'external-tool-integrations';
  guidePath: string;
  primarySurface: string;
  setupSurface: string;
  reviewSurface: string;
  steps: XenesisConnectionToolSetupPlanStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionProviderSetupPlanRuntimeSupport = 'configured-provider' | 'missing-required-field';
export type XenesisConnectionProviderSetupPlanStepKind = 'read' | 'open' | 'request' | 'apply';

export interface XenesisConnectionProviderSetupPlanStep {
  id: string;
  label: string;
  kind: XenesisConnectionProviderSetupPlanStepKind;
  crPath: string;
  args?: Record<string, unknown>;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionProviderSetupPlanTemplate {
  planStatus: XenesisConnectionDiagnosticRunbookReadiness;
  runtimeSupport: XenesisConnectionProviderSetupPlanRuntimeSupport;
  guideId: 'onboarding-connections';
  guidePath: string;
  primarySurface: string;
  setupSurface: string;
  reviewSurface: string;
  steps: XenesisConnectionProviderSetupPlanStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionChannelSetupPlanRuntimeSupport = 'implemented' | 'planned-adapter';
export type XenesisConnectionChannelSetupPlanStepKind = 'read' | 'open' | 'request' | 'apply';

export interface XenesisConnectionChannelSetupPlanStep {
  id: string;
  label: string;
  kind: XenesisConnectionChannelSetupPlanStepKind;
  crPath: string;
  args?: Record<string, unknown>;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionChannelSetupPlanTemplate {
  planStatus: XenesisConnectionDiagnosticRunbookReadiness;
  runtimeSupport: XenesisConnectionChannelSetupPlanRuntimeSupport;
  guideId: 'openclaw-channel-setup';
  guidePath: string;
  primarySurface: string;
  setupSurface: string;
  reviewSurface: string;
  steps: XenesisConnectionChannelSetupPlanStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionToolSetupTemplate {
  connection: 'mcp' | 'oauth-mcp' | 'local';
  authMode: 'none' | 'env-token' | 'oauth';
  dataScopes: string[];
  writeScopes: string[];
  credentialStorage: string;
  setupSurface: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}

export type XenesisConnectionToolInstallPlanMode = 'copy-template' | 'oauth-template' | 'planned-oauth';
export type XenesisConnectionToolInstallPlanRuntimeSupport = 'ready-template' | 'planned-oauth';

export interface XenesisConnectionToolInstallPlanTemplate {
  installMode: XenesisConnectionToolInstallPlanMode;
  runtimeSupport: XenesisConnectionToolInstallPlanRuntimeSupport;
  primarySurface: string;
  setupSurface: string;
  installSurface: string;
  installActions: string[];
  installSteps: string[];
  configTargets: string[];
  requiredEnv: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionToolConnectorCredentialState = XenesisConnectionProviderCredentialState | 'planned';
export type XenesisConnectionToolConnectorCredentialSource = 'env' | 'oauth-client' | 'workspace-config' | 'none';

export interface XenesisConnectionToolConnectorCredentialRef {
  ref: string;
  source: XenesisConnectionToolConnectorCredentialSource;
  required: boolean;
  state: XenesisConnectionToolConnectorCredentialState;
}

export interface XenesisConnectionToolConnectorTemplate {
  connectorType: 'mcp-stdio' | 'mcp-http' | 'oauth-mcp' | 'local';
  authMode: 'none' | 'env-token' | 'oauth';
  runtimeSupport: 'ready-template' | 'manual-config' | 'planned-oauth';
  credentialRefs: XenesisConnectionToolConnectorCredentialRef[];
  credentialState: XenesisConnectionToolConnectorCredentialState;
  dataScopes: string[];
  writeScopes: string[];
  setupSurface: string;
  validationChecks: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionToolOAuthDraftStatus = 'planned-template' | 'missing-required-field' | 'ready' | 'unknown';
export type XenesisConnectionToolOAuthDraftFieldValueState =
  | 'planned'
  | 'missing'
  | 'configured'
  | 'not-required'
  | 'unknown';

export interface XenesisConnectionToolOAuthDraftField {
  field: string;
  label: string;
  required: boolean;
  secretRef: boolean;
  valueState: XenesisConnectionToolOAuthDraftFieldValueState;
  source: string;
  description: string;
}

export type XenesisConnectionToolOAuthDraftReviewStepId =
  | 'oauth-app-registration'
  | 'scope-review'
  | 'token-store-readiness'
  | 'readback-verification';

export interface XenesisConnectionToolOAuthDraftReviewStep {
  id: XenesisConnectionToolOAuthDraftReviewStepId;
  label: string;
  phase: XenesisConnectionToolOAuthDraftReviewStepId;
  expectedState: string;
  requiredFields: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionToolOAuthSetupPacketCredentialRef {
  ref: string;
  label: string;
  required: boolean;
  secretRef: boolean;
  valueState: XenesisConnectionToolOAuthDraftFieldValueState;
  source: string;
  description: string;
}

export interface XenesisConnectionToolOAuthSetupPacket {
  packetStatus: XenesisConnectionToolOAuthDraftStatus;
  provider: 'google';
  tool: string;
  displayName: string;
  setupSurface: string;
  reviewSurface: string;
  redirectUriPolicy: string;
  redirectUriCandidates: string[];
  credentialRefs: XenesisConnectionToolOAuthSetupPacketCredentialRef[];
  scopes: string[];
  tokenStore: string;
  consentMode: string;
  checklist: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionToolOAuthDraftTemplate {
  draftStatus: XenesisConnectionToolOAuthDraftStatus;
  actionInboxKind: 'xenesis-tool-oauth-draft';
  tool: string;
  displayName: string;
  description?: string;
  runtimeSupport: 'planned-oauth' | 'ready-template';
  authSurface: string;
  reviewSurface: string;
  profileFields: XenesisConnectionToolOAuthDraftField[];
  missingRequiredFields: string[];
  scopes: string[];
  tokenStore: string;
  consentMode: string;
  setupPacket: XenesisConnectionToolOAuthSetupPacket;
  reviewSteps: XenesisConnectionToolOAuthDraftReviewStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionToolViewTemplate {
  viewType: 'connection-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.tools.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  viewSections: XenesisConnectionToolViewSection[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionToolViewSection {
  id: XenesisConnectionToolViewSectionId;
  label: string;
  focusConnectionDetail: XenesisConnectionCenterDetailFocus;
  openArgs: { id: string; section: XenesisConnectionToolViewSectionId; ensureVisible: true };
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionToolUserStoryWorkflowType =
  | 'web-context'
  | 'workspace-context'
  | 'repo-triage'
  | 'knowledge-capture'
  | 'task-triage'
  | 'inbox-triage'
  | 'calendar-context';

export type XenesisConnectionToolUserStoryRuntimeSupport = 'ready-template' | 'planned-oauth' | 'ready-local';

export interface XenesisConnectionToolUserStoryTemplate {
  workflowType: XenesisConnectionToolUserStoryWorkflowType;
  runtimeSupport: XenesisConnectionToolUserStoryRuntimeSupport;
  primarySurface: string;
  setupSurface: string;
  userStories: string[];
  prerequisiteConnectors: string[];
  requiredScopes: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionToolActionCatalogRuntimeSupport = 'ready-template' | 'planned-oauth' | 'ready-local';
export type XenesisConnectionToolActionCatalogGroupKind = 'search' | 'read' | 'write';
export type XenesisConnectionToolActionCatalogApprovalPolicy =
  | 'read-only'
  | 'approval-gated'
  | 'blocked-until-verified';

export interface XenesisConnectionToolActionCatalogAction {
  label: string;
  toolNames: string[];
  dataScopes: string[];
  risk: 'low' | 'medium' | 'high';
}

export interface XenesisConnectionToolActionCatalogGroup {
  kind: XenesisConnectionToolActionCatalogGroupKind;
  label: string;
  approvalPolicy: XenesisConnectionToolActionCatalogApprovalPolicy;
  actions: XenesisConnectionToolActionCatalogAction[];
}

export interface XenesisConnectionToolActionCatalogTemplate {
  runtimeSupport: XenesisConnectionToolActionCatalogRuntimeSupport;
  actionInboxKind: 'xenesis-tool-action-policy';
  primarySurface: string;
  reviewSurface: string;
  groups: XenesisConnectionToolActionCatalogGroup[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionChannelUserStoryWorkflowType =
  | 'remote-prompt'
  | 'team-thread'
  | 'webhook-ingress'
  | 'planned-messenger'
  | 'planned-mailbox';

export type XenesisConnectionChannelUserStoryRuntimeSupport = 'implemented' | 'planned-adapter';

export interface XenesisConnectionChannelUserStoryTemplate {
  workflowType: XenesisConnectionChannelUserStoryWorkflowType;
  runtimeSupport: XenesisConnectionChannelUserStoryRuntimeSupport;
  primarySurface: string;
  setupSurface: string;
  userStories: string[];
  prerequisiteSetup: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionChannelProfileDraftStatus =
  | 'ready'
  | 'missing-required-field'
  | 'disabled'
  | 'planned'
  | 'unknown';
export type XenesisConnectionChannelProfileDraftFieldValueState =
  | 'configured'
  | 'empty'
  | 'missing-env'
  | 'not-required'
  | 'planned'
  | 'unknown';

export interface XenesisConnectionChannelProfileDraftField {
  field: string;
  label: string;
  required: boolean;
  secretRef: boolean;
  valueState: XenesisConnectionChannelProfileDraftFieldValueState;
  description: string;
}

export interface XenesisConnectionChannelProfileDraftGuardrails {
  approvalMode: 'readonly' | 'safe' | 'auto';
  maxTurns: number;
  maxTokens: number;
}

export type XenesisConnectionChannelProfileDraftReviewStepId =
  | 'channel-credential-readiness'
  | 'access-allowlist-review'
  | 'delivery-guardrails'
  | 'pairing-readback';

export interface XenesisConnectionChannelProfileDraftReviewStep {
  id: XenesisConnectionChannelProfileDraftReviewStepId;
  label: string;
  phase: XenesisConnectionChannelProfileDraftReviewStepId;
  expectedState: string;
  requiredFields: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionChannelProfileDraftTemplate {
  draftStatus: XenesisConnectionChannelProfileDraftStatus;
  actionInboxKind: 'xenesis-channel-profile-draft';
  channel: string;
  displayName: string;
  description?: string;
  setupSurface: string;
  reviewSurface: string;
  profileFields: XenesisConnectionChannelProfileDraftField[];
  missingRequiredFields: string[];
  guardrails: XenesisConnectionChannelProfileDraftGuardrails;
  reviewSteps: XenesisConnectionChannelProfileDraftReviewStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionProviderProfileDraftStatus = 'ready' | 'missing-required-field' | 'unknown';
export type XenesisConnectionProviderProfileDraftFieldValueState =
  | 'configured'
  | 'missing'
  | 'not-required'
  | 'default'
  | 'unknown';

export interface XenesisConnectionProviderProfileDraftField {
  field: string;
  label: string;
  required: boolean;
  secretRef: boolean;
  valueState: XenesisConnectionProviderProfileDraftFieldValueState;
  source: string;
  description: string;
}

export interface XenesisConnectionProviderProfileDraftGuardrails {
  approvalMode: 'readonly' | 'safe' | 'auto';
  providerRetries: number;
  fallbackPolicy: string;
  localCliBoundary: string;
}

export type XenesisConnectionProviderProfileDraftReviewStepId =
  | 'provider-identity'
  | 'model-credential-readiness'
  | 'runtime-routing'
  | 'local-cli-boundary';

export interface XenesisConnectionProviderProfileDraftReviewStep {
  id: XenesisConnectionProviderProfileDraftReviewStepId;
  label: string;
  phase: XenesisConnectionProviderProfileDraftReviewStepId;
  expectedState: string;
  requiredFields: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundary: string;
}

export interface XenesisConnectionProviderProfileDraftTemplate {
  draftStatus: XenesisConnectionProviderProfileDraftStatus;
  actionInboxKind: 'xenesis-provider-profile-draft';
  provider: string;
  displayName: string;
  description?: string;
  setupSurface: string;
  reviewSurface: string;
  profileFields: XenesisConnectionProviderProfileDraftField[];
  missingRequiredFields: string[];
  guardrails: XenesisConnectionProviderProfileDraftGuardrails;
  reviewSteps: XenesisConnectionProviderProfileDraftReviewStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionProviderSetupTemplate {
  source: 'user-settings' | 'auto-detect' | 'local-cli' | 'byok';
  provider: string;
  model: string;
  authMode: 'auto-detect' | 'local-login' | 'api-key' | 'none';
  credentialState: 'configured' | 'missing' | 'not-required';
  credentialStorage: string;
  endpoint: string;
  runtimeProfile: string;
  runtimeProvider: string;
  runtimeModel: string;
  providerRetries: number;
  fallbackPolicy: string;
  localCliBoundary: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}

export interface XenesisConnectionProviderViewTemplate {
  viewType: 'provider-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.providers.views.open';
  openArgs: { provider: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionProviderCredentialState = 'configured' | 'missing' | 'not-required';

export interface XenesisConnectionProviderFallbackInput {
  provider: string;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
}

export interface XenesisConnectionProviderFallbackChainItem {
  index: number;
  provider: string;
  model: string;
  baseURLState: 'default' | 'custom';
  apiKeyEnv: string;
  credentialState: XenesisConnectionProviderCredentialState;
}

export interface XenesisConnectionProviderCredentialPoolItem {
  provider: string;
  apiKeyEnv: string;
  credentialState: XenesisConnectionProviderCredentialState;
  source: 'runtime' | 'fallback';
}

export interface XenesisConnectionProviderRoutingTemplate {
  routeSource: 'user-settings-profile';
  activeProvider: string;
  activeModel: string;
  runtimeProfile: string;
  runtimeProvider: string;
  runtimeModel: string;
  retryPolicy: {
    maxRetries: number;
    source: 'profile.policy.providerRetries';
  };
  fallbackPolicy: string;
  fallbackChainSource: 'xenesis-runtime-config';
  fallbackChainVisible: boolean;
  fallbackChain: XenesisConnectionProviderFallbackChainItem[];
  credentialPools: XenesisConnectionProviderCredentialPoolItem[];
  readPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionChannelTemplate {
  category: 'consumer' | 'enterprise' | 'developer' | 'community' | 'regional' | 'iot';
  adapter: string;
  auth: string;
  capabilities: string[];
  safetyControls: string[];
  routing?: XenesisConnectionChannelRoutingTemplate;
  safety?: XenesisConnectionChannelSafetyTemplate;
  accessGroups?: XenesisConnectionChannelAccessGroupsTemplate;
  pairing?: XenesisConnectionChannelPairingTemplate;
  userStory?: XenesisConnectionChannelUserStoryTemplate;
}

export interface XenesisConnectionChannelRoutingTemplate {
  routeBinding: string;
  allowlistFields: string[];
  pairing: string;
  defaultAgent: string;
  sessionScope: string;
  diagnostics: string[];
  deliveryFeatures: string[];
}

export interface XenesisConnectionChannelSafetyTemplate {
  accessModel: 'allowlist' | 'signature-verified' | 'network-boundary';
  accessGroupFields: string[];
  inboundBoundary: string;
  outboundBoundary: string;
  loopProtection: string[];
  approvalGuardrails: Array<'readonly' | 'safe' | 'auto'>;
  troubleshooting: string[];
  readPaths: string[];
  controlPaths: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionChannelAccessGroupBinding {
  groupId: string;
  field: string;
  required: boolean;
  emptyDiagnostic: string;
  description: string;
}

export interface XenesisConnectionChannelAccessGroupsTemplate {
  model: 'profile-allowlist-fields';
  groupScope: 'chat' | 'channel' | 'guild' | 'endpoint';
  failClosed: boolean;
  bindings: XenesisConnectionChannelAccessGroupBinding[];
  diagnostics: string[];
  readPaths: string[];
  controlPaths: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionChannelPairingModel =
  | 'env-token'
  | 'env-token-signature'
  | 'webhook-url'
  | 'device-link'
  | 'oauth-app'
  | 'desktop-bridge'
  | 'provider-webhook'
  | 'mailbox'
  | 'local-network';
export type XenesisConnectionChannelPairingRuntimeSupport = 'implemented' | 'planned-adapter';
export type XenesisConnectionChannelPairingState = 'configured' | 'missing' | 'not-required' | 'planned' | 'unknown';
export type XenesisConnectionChannelPairingCredentialSource =
  | 'profile-env-field'
  | 'env'
  | 'device-pairing'
  | 'oauth-client'
  | 'desktop-host'
  | 'provider-account'
  | 'mailbox'
  | 'local-network'
  | 'none';

export interface XenesisConnectionChannelPairingCredentialRef {
  ref: string;
  source: XenesisConnectionChannelPairingCredentialSource;
  required: boolean;
  state: XenesisConnectionChannelPairingState;
}

export interface XenesisConnectionChannelPairingTemplate {
  model: XenesisConnectionChannelPairingModel;
  runtimeSupport: XenesisConnectionChannelPairingRuntimeSupport;
  accountScope:
    | 'bot-account'
    | 'workspace-app'
    | 'device'
    | 'desktop-host'
    | 'provider-account'
    | 'mailbox'
    | 'endpoint'
    | 'local-network';
  credentialRefs: XenesisConnectionChannelPairingCredentialRef[];
  pairingState: XenesisConnectionChannelPairingState;
  setupSurface: string;
  validationChecks: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionMessengerViewTemplate {
  viewType: 'messenger-detail';
  runtimeSupport: 'implemented' | 'planned';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.messengers.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionGuideCatalogTemplate {
  guideType: 'setup-playbook' | 'integration-guide' | 'user-story-catalog';
  audience: 'operator' | 'agent' | 'developer';
  primarySurface: string;
  coveredSurfaces: string[];
  prerequisites: string[];
  validationChecks: string[];
  readPaths: string[];
  controlPaths: string[];
  userStoryTemplates: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionGuideFileStatus = 'available' | 'missing' | 'unresolved';

export interface XenesisConnectionGuideFileTemplate {
  status: XenesisConnectionGuideFileStatus;
  guidePath: string;
  guideOpenPath?: string;
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionDiagnosticRunbookStep {
  id: string;
  label: string;
  expectedState: string;
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
}

export interface XenesisConnectionDiagnosticRunbookTemplate {
  scope: XenesisConnectionKind;
  readiness: XenesisConnectionDiagnosticRunbookReadiness;
  primarySurface: string;
  setupSurface: string;
  steps: XenesisConnectionDiagnosticRunbookStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionSetupRequestTemplate {
  requestType: XenesisConnectionSetupRequestType;
  actionInboxKind: 'xenesis-connection-setup';
  readiness: XenesisConnectionDiagnosticRunbookReadiness;
  title: string;
  description: string;
  setupSurface: string;
  reviewSurface: string;
  steps: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
  review?: XenesisConnectionSetupRequestReview;
}

export interface XenesisConnectionItem {
  id: string;
  kind: XenesisConnectionKind;
  label: string;
  status: XenesisConnectionStatus;
  summary: string;
  supportLevel?: XenesisConnectionSupportLevel;
  setupSteps?: string[];
  sourceDocs?: XenesisConnectionSourceDoc[];
  requiredEnv?: string[];
  missingEnv?: string[];
  crActions?: string[];
  settingsTarget?: string;
  settingsAction?: XenesisConnectionSettingsAction;
  guidePath?: string;
  guideOpenPath?: string;
  mcpTemplate?: XenesisConnectionMcpTemplate;
  onboardingPlan?: XenesisConnectionOnboardingPlanTemplate;
  providerSetup?: XenesisConnectionProviderSetupTemplate;
  providerView?: XenesisConnectionProviderViewTemplate;
  providerRouting?: XenesisConnectionProviderRoutingTemplate;
  providerProfileDraft?: XenesisConnectionProviderProfileDraftTemplate;
  providerSetupPlan?: XenesisConnectionProviderSetupPlanTemplate;
  toolSetup?: XenesisConnectionToolSetupTemplate;
  toolInstallPlan?: XenesisConnectionToolInstallPlanTemplate;
  toolConnector?: XenesisConnectionToolConnectorTemplate;
  toolOAuthDraft?: XenesisConnectionToolOAuthDraftTemplate;
  mcpInstallDraft?: XenesisConnectionMcpInstallDraftTemplate;
  toolView?: XenesisConnectionToolViewTemplate;
  toolSetupPlan?: XenesisConnectionToolSetupPlanTemplate;
  toolUserStory?: XenesisConnectionToolUserStoryTemplate;
  toolActionCatalog?: XenesisConnectionToolActionCatalogTemplate;
  messengerView?: XenesisConnectionMessengerViewTemplate;
  channelSetupPlan?: XenesisConnectionChannelSetupPlanTemplate;
  channelProfileDraft?: XenesisConnectionChannelProfileDraftTemplate;
  guideCatalog?: XenesisConnectionGuideCatalogTemplate;
  guideFile?: XenesisConnectionGuideFileTemplate;
  channelTemplate?: XenesisConnectionChannelTemplate;
  diagnosticRunbook?: XenesisConnectionDiagnosticRunbookTemplate;
  setupRequest?: XenesisConnectionSetupRequestTemplate;
  warnings?: string[];
}

export interface XenesisConnectionNaturalWordsTarget {
  id: string;
  label: string;
  words: readonly string[];
}

export interface XenesisConnectionNaturalConnectionTarget extends XenesisConnectionNaturalWordsTarget {
  kind: 'tool' | 'messenger';
  supportLevel?: XenesisConnectionSupportLevel;
}

export interface XenesisConnectionNaturalGuideTarget extends XenesisConnectionNaturalWordsTarget {
  requiredWordGroups?: readonly (readonly string[])[];
  blockedByMatchedTargetIds?: readonly string[];
  fallback?: boolean;
}

export interface XenesisConnectionSection {
  id: string;
  label: string;
  items: XenesisConnectionItem[];
}

export interface XenesisConnectionsStatus {
  ok: boolean;
  updatedAt: string;
  summary: Record<XenesisConnectionStatus, number> & { total: number };
  sections: {
    onboarding: XenesisConnectionSection;
    provider: XenesisConnectionSection;
    localCli: XenesisConnectionSection;
    mcp: XenesisConnectionSection;
    tools: XenesisConnectionSection;
    gateway: XenesisConnectionSection;
    messengers: XenesisConnectionSection;
    guides: XenesisConnectionSection;
  };
  warnings: string[];
}

export interface BuildXenesisConnectionsStatusInput {
  aiProvider: Pick<AiProviderSettings, 'provider' | 'model' | 'apiKey' | 'baseUrl'>;
  mcp: McpSettingsStatus;
  providerIntegration: ProviderIntegrationStatus;
  xenesis: XenesisStatus | null;
  providerFallbacks?: XenesisConnectionProviderFallbackInput[];
  env?: Record<string, string | undefined>;
  now?: Date;
  repoRoot?: string;
  guideFileExists?: (guideOpenPath: string) => boolean;
}

export const XENESIS_CONNECTION_ONBOARDING_STEP_IDS = [
  'first-chat',
  'local-cli-mcp',
  'recommended-tools',
  'gateway',
  'messenger-routing',
  'test-send',
] as const;

export const XENESIS_CONNECTION_PROVIDER_IDS = [
  'auto',
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek',
  'qwen',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
  'azure',
  'codex-cli',
  'codex-app-server',
  'claude-cli',
  'claude-interactive',
] as const;

export const XENESIS_CONNECTION_TOOL_OAUTH_DRAFT_IDS = ['google-workspace', 'google-calendar'] as const;

export const XENESIS_CONNECTION_GUIDES: XenesisConnectionItem[] = [
  {
    id: 'onboarding-connections',
    kind: 'guide',
    label: 'Onboarding and connections',
    status: 'ready',
    summary: 'First-run setup order for providers, MCP tools, gateway, and external bot channels.',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    guideCatalog: {
      guideType: 'setup-playbook',
      audience: 'operator',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['providers', 'mcp-tools', 'gateway', 'messengers', 'guides'],
      prerequisites: ['choose AI provider', 'configure MCP bridge', 'review external bot gateway'],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.providers.setup.status',
        'xd.xenesis.tools.setup.status',
        'xd.xenesis.messengers.views.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open', 'xd.xenesis.connections.open', 'xd.files.open'],
      userStoryTemplates: [
        'first-run provider and MCP setup',
        'connect a planned external tool without pretending it is installed',
        'verify messenger routing before remote prompts',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'guide open may open a repo-local file or focus a Settings card',
        'actual provider, tool, and channel mutations stay on their existing CR paths',
      ],
    },
  },
  {
    id: 'cr-mcp-gateway-bots',
    kind: 'guide',
    label: 'Capability Registry, MCP, gateway, and bots',
    status: 'ready',
    summary: 'Existing CR, MCP bridge, gateway, and bot session reference.',
    guidePath: 'docs/manual/05-cr-mcp-gateway-bots.md',
    guideCatalog: {
      guideType: 'integration-guide',
      audience: 'developer',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['capability-registry', 'mcp-bridge', 'gateway', 'bot-sessions'],
      prerequisites: ['MCP bridge configured', 'Xenesis gateway reviewed', 'CR caller available'],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.gateway.status',
        'xd.xenesis.channels.routing.status',
        'xd.xenesis.channels.safety.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open', 'xd.xenesis.connections.open', 'xd.files.open'],
      userStoryTemplates: [
        'inspect CR paths before driving Desk behavior',
        'verify gateway state before external bot delivery',
        'read channel routing and safety before profile mutations',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'CR mutations remain on their owning capability paths',
        'gateway and bot delivery tests stay on existing runtime CR paths',
      ],
    },
  },
  {
    id: 'openclaw-channel-setup',
    kind: 'guide',
    label: 'OpenClaw-style channel setup',
    status: 'ready',
    summary: 'Repo-local setup guide for external messenger channels, routing, pairing, and safety readbacks.',
    guidePath: 'docs/manual/10-openclaw-channel-setup.md',
    sourceDocs: [
      { label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' },
      { label: 'OpenClaw channel routing', url: 'https://docs.openclaw.ai/channels/channel-routing' },
      { label: 'OpenClaw access groups', url: 'https://docs.openclaw.ai/channels/access-groups' },
      { label: 'OpenClaw troubleshooting', url: 'https://docs.openclaw.ai/channels/troubleshooting' },
    ],
    guideCatalog: {
      guideType: 'integration-guide',
      audience: 'operator',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: [
        'messenger-catalog',
        'channel-setup-plans',
        'channel-routing',
        'access-groups',
        'pairing',
        'diagnostics',
      ],
      prerequisites: [
        'gateway status readback',
        'messenger setup view readback',
        'implemented channel allowlist review',
      ],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.messengers.views.status',
        'xd.xenesis.channels.setupPlans.status',
        'xd.xenesis.channels.routing.status',
        'xd.xenesis.channels.safety.status',
        'xd.xenesis.channels.accessGroups.status',
        'xd.xenesis.channels.pairing.status',
      ],
      readPaths: [
        'xd.xenesis.connections.status',
        'xd.xenesis.guides.status',
        'xd.xenesis.messengers.views.status',
        'xd.xenesis.channels.setupPlans.status',
        'xd.xenesis.channels.routing.status',
        'xd.xenesis.channels.safety.status',
        'xd.xenesis.channels.accessGroups.status',
        'xd.xenesis.channels.pairing.status',
        'xd.xenesis.connections.diagnostics.status',
      ],
      controlPaths: [
        'xd.xenesis.guides.open',
        'xd.xenesis.messengers.views.open',
        'xd.xenesis.channels.setupPlans.open',
        'xd.xenesis.channels.userStories.open',
        'xd.xenesis.connections.diagnostics.open',
      ],
      userStoryTemplates: [
        'open an external messenger setup view before enabling delivery',
        'open a channel setup plan before pairing or profile changes',
        'inspect routing, safety, access group, and pairing readbacks',
        'keep planned messengers as readiness views until adapters are verified',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'planned messenger guides do not enable delivery or create adapters',
        'channel settings, allowlists, profile writes, and test sends remain on explicit CR paths',
      ],
    },
  },
  {
    id: 'external-tool-integrations',
    kind: 'guide',
    label: 'External tool integrations',
    status: 'ready',
    summary: 'Repo-local setup guide for MCP tools, OAuth drafts, connector readbacks, and tool action policies.',
    guidePath: 'docs/manual/11-external-tool-integrations.md',
    sourceDocs: [
      { label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' },
      { label: 'Hermes quick start', url: 'https://hermes-agent.nousresearch.com/docs/getting-started/quick-start' },
      { label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' },
    ],
    guideCatalog: {
      guideType: 'integration-guide',
      audience: 'operator',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: [
        'external-tools',
        'setup-plans',
        'mcp-connectors',
        'oauth-drafts',
        'tool-actions',
        'user-stories',
      ],
      prerequisites: [
        'provider setup readback',
        'MCP settings readback',
        'tool view readback',
        'setup request review when install or OAuth work is needed',
      ],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.tools.setup.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.oauthDrafts.status',
        'xd.xenesis.tools.actions.status',
      ],
      readPaths: [
        'xd.xenesis.connections.status',
        'xd.xenesis.guides.status',
        'xd.xenesis.tools.setupPlans.status',
        'xd.xenesis.tools.views.status',
        'xd.xenesis.tools.setup.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.installPlans.status',
        'xd.xenesis.tools.oauthDrafts.status',
        'xd.xenesis.tools.actions.status',
        'xd.xenesis.tools.userStories.status',
      ],
      controlPaths: [
        'xd.xenesis.guides.open',
        'xd.xenesis.tools.setupPlans.open',
        'xd.xenesis.tools.views.open',
        'xd.xenesis.tools.installPlans.open',
        'xd.xenesis.tools.oauthDrafts.open',
        'xd.xenesis.tools.actions.open',
        'xd.xenesis.connections.setupRequests.request',
      ],
      userStoryTemplates: [
        'inspect an external tool setup view before installing MCP support',
        'review OAuth drafts before Google Workspace or Calendar setup',
        'open action policies before allowing provider tool execution',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'tool integration guides do not install MCP servers or complete OAuth',
        'provider tool execution, token storage, and settings writes remain on explicit CR paths',
      ],
    },
  },
  {
    id: 'agent-user-stories',
    kind: 'guide',
    label: 'Agent user stories',
    status: 'ready',
    summary:
      'Hermes-style task and user-story scenarios for provider setup, external tools, messenger ingress, and CR-controlled Desk workflows.',
    guidePath: 'docs/manual/12-agent-user-stories.md',
    sourceDocs: [
      { label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' },
      { label: 'Hermes MCP feature', url: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp' },
      { label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' },
    ],
    guideCatalog: {
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: [
        'ai-provider-user-stories',
        'external-tool-user-stories',
        'messenger-user-stories',
        'capability-registry-readbacks',
      ],
      prerequisites: [
        'connection catalog readback',
        'provider routing readback',
        'tool view readback',
        'messenger view readback',
      ],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.providers.setup.status',
        'xd.xenesis.providers.routing.status',
        'xd.xenesis.providers.views.status',
        'xd.xenesis.tools.views.status',
        'xd.xenesis.tools.userStories.status',
        'xd.xenesis.messengers.views.status',
        'xd.xenesis.channels.userStories.status',
        'xd.xenesis.connections.diagnostics.status',
      ],
      readPaths: [
        'xd.xenesis.connections.status',
        'xd.xenesis.guides.status',
        'xd.xenesis.providers.setup.status',
        'xd.xenesis.providers.routing.status',
        'xd.xenesis.providers.views.status',
        'xd.xenesis.tools.views.status',
        'xd.xenesis.tools.userStories.status',
        'xd.xenesis.messengers.views.status',
        'xd.xenesis.channels.userStories.status',
        'xd.xenesis.connections.diagnostics.status',
      ],
      controlPaths: [
        'xd.xenesis.guides.open',
        'xd.xenesis.providers.views.open',
        'xd.xenesis.tools.views.open',
        'xd.xenesis.tools.userStories.open',
        'xd.xenesis.messengers.views.open',
        'xd.xenesis.channels.userStories.open',
        'xd.xenesis.connections.diagnostics.open',
      ],
      userStoryTemplates: [
        'inspect active provider routing before running a task',
        'connect Notion or Google Calendar as a planned MCP/OAuth workflow',
        'open a messenger setup view and verify routing/safety before remote prompts',
        'turn a natural-language task scenario into CR readbacks, opens, requests, and completion evidence',
        'drive Desk actions through CR and verify readback',
      ],
      safetyBoundaries: [
        'guide catalog does not execute workflows',
        'planned integrations remain setup/readiness views until runtime support exists',
        'CR readback must verify any guide-driven action',
      ],
    },
  },
];

export const XENESIS_CONNECTION_GUIDE_IDS = XENESIS_CONNECTION_GUIDES.map((item) => item.id);

function isAbsoluteLocalPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\') || value.startsWith('/');
}

function resolveRepoLocalPath(repoRoot: string | undefined, relativePath: string | undefined): string | undefined {
  const root = repoRoot?.trim();
  const target = relativePath?.trim();
  if (!target) return undefined;
  if (!root || isAbsoluteLocalPath(target)) return target;
  const separator = root.includes('\\') ? '\\' : '/';
  const cleanRoot = root.replace(/[\\/]+$/, '');
  const cleanTarget = target.replace(/^[\\/]+/, '').replace(/[\\/]/g, separator);
  return `${cleanRoot}${separator}${cleanTarget}`;
}

function buildXenesisGuideFileReadback(input: {
  guidePath: string | undefined;
  guideOpenPath: string | undefined;
  guideFileExists: ((guideOpenPath: string) => boolean) | undefined;
}): XenesisConnectionGuideFileTemplate | undefined {
  const guidePath = input.guidePath?.trim();
  if (!guidePath) return undefined;

  const guideOpenPath = input.guideOpenPath?.trim() || undefined;
  const status: XenesisConnectionGuideFileStatus =
    !guideOpenPath || !input.guideFileExists
      ? 'unresolved'
      : input.guideFileExists(guideOpenPath)
        ? 'available'
        : 'missing';

  return {
    status,
    guidePath,
    ...(guideOpenPath ? { guideOpenPath } : {}),
    readPaths: ['xd.xenesis.guides.status'],
    controlPaths: status === 'available' ? ['xd.xenesis.guides.open', 'xd.files.open'] : ['xd.xenesis.guides.open'],
    diagnostics: [`guide-file-${status}`],
    safetyBoundaries: [
      'guide file readback does not read file contents',
      'guide file opens stay on existing guide/file CR paths',
    ],
  };
}

function withGuideOpenPaths(
  items: XenesisConnectionItem[],
  repoRoot: string | undefined,
  guideFileExists?: (guideOpenPath: string) => boolean,
): XenesisConnectionItem[] {
  return items.map((item) => {
    const guideOpenPath = resolveRepoLocalPath(repoRoot, item.guidePath);
    const nextGuideOpenPath = guideOpenPath || item.guideOpenPath;
    const guideFile = buildXenesisGuideFileReadback({
      guidePath: item.guidePath,
      guideOpenPath: nextGuideOpenPath,
      guideFileExists,
    });
    return {
      ...item,
      ...(nextGuideOpenPath ? { guideOpenPath: nextGuideOpenPath } : {}),
      ...(guideFile ? { guideFile } : {}),
    };
  });
}

const RECOMMENDED_MCP_BY_NAME = new Map(listRecommendedMcpServers().map((server) => [server.name, server]));

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlArray(values: string[] | undefined): string {
  return `[${(values ?? []).map((value) => tomlString(value)).join(', ')}]`;
}

function jsonMcpServerEntry(server: RecommendedMcpServer): Record<string, unknown> {
  if (server.template.type === 'stdio') {
    return {
      command: server.template.command,
      args: server.template.args ?? [],
      ...(server.template.env && Object.keys(server.template.env).length > 0 ? { env: server.template.env } : {}),
    };
  }
  return {
    url: server.template.url,
    ...(server.template.transport ? { transport: server.template.transport } : {}),
    ...(server.template.headers ? { headers: server.template.headers } : {}),
    ...(server.template.auth ? { auth: server.template.auth } : {}),
  };
}

function codexTomlMcpServerSnippet(server: RecommendedMcpServer): string {
  const lines = [`[mcp_servers.${server.name}]`, 'enabled = true'];
  if (server.template.type === 'stdio') {
    lines.push(`command = ${tomlString(server.template.command)}`);
    if (server.template.args?.length) lines.push(`args = ${tomlArray(server.template.args)}`);
    if (server.defaultEnabledTools?.length) {
      lines.push('');
      lines.push(`[mcp_servers.${server.name}.tool_filter]`);
      lines.push(`include = ${tomlArray(server.defaultEnabledTools)}`);
    }
    if (server.template.env && Object.keys(server.template.env).length > 0) {
      lines.push('');
      lines.push(`[mcp_servers.${server.name}.env]`);
      for (const [key, value] of Object.entries(server.template.env)) {
        lines.push(`${key} = ${tomlString(value)}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  lines.push(`url = ${tomlString(server.template.url)}`);
  if (server.template.transport) lines.push(`transport = ${tomlString(server.template.transport)}`);
  if (server.template.auth) lines.push(`auth = ${tomlString(server.template.auth)}`);
  return `${lines.join('\n')}\n`;
}

function mcpTemplateFor(serverName: string): XenesisConnectionMcpTemplate | undefined {
  const server = RECOMMENDED_MCP_BY_NAME.get(serverName);
  if (!server) return undefined;
  const jsonSnippet = JSON.stringify(
    {
      mcpServers: {
        [server.name]: jsonMcpServerEntry(server),
      },
    },
    null,
    2,
  );
  return {
    serverName: server.name,
    displayName: server.displayName,
    description: server.description,
    transport: server.transport,
    requiredEnv: [...(server.requiredEnv ?? [])],
    ...(server.defaultEnabledTools?.length ? { defaultEnabledTools: [...server.defaultEnabledTools] } : {}),
    ...(server.template.type === 'stdio'
      ? {
          command: server.template.command,
          args: [...(server.template.args ?? [])],
          env: { ...(server.template.env ?? {}) },
        }
      : {
          url: server.template.url,
          ...(server.template.auth ? { auth: server.template.auth } : {}),
        }),
    configSnippets: {
      json: `${jsonSnippet}\n`,
      codexToml: codexTomlMcpServerSnippet(server),
    },
  };
}

function toolViewTemplate(
  id: string,
  setupSurface: string,
  options: { hasMcpTemplate?: boolean } = {},
): XenesisConnectionToolViewTemplate {
  const viewSections = toolViewSections(id, options);
  return {
    viewType: 'connection-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface,
    openPath: 'xd.xenesis.tools.views.open',
    openArgs: { id },
    connectionCardId: id,
    internalViews: options.hasMcpTemplate
      ? ['connection-card', 'setup-recipe', 'mcp-template']
      : ['connection-card', 'setup-recipe'],
    viewSections,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
    diagnostics: options.hasMcpTemplate
      ? ['mcp-settings-status', 'missing-env', 'template-snippet']
      : ['mcp-settings-status', 'missing-env'],
    safetyBoundaries: [
      'view opens internal setup/readiness surfaces only',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  };
}

function toolViewSection(
  input: Omit<XenesisConnectionToolViewSection, 'openArgs'> & { toolId: string },
): XenesisConnectionToolViewSection {
  return {
    id: input.id,
    label: input.label,
    focusConnectionDetail: input.focusConnectionDetail,
    openArgs: { id: input.toolId, section: input.id, ensureVisible: true },
    readPaths: input.readPaths,
    controlPaths: input.controlPaths,
    diagnostics: input.diagnostics,
    safetyBoundaries: input.safetyBoundaries,
  };
}

function toolViewSections(
  toolId: string,
  options: { hasMcpTemplate?: boolean } = {},
): XenesisConnectionToolViewSection[] {
  const plannedOauth = (XENESIS_CONNECTION_TOOL_OAUTH_DRAFT_IDS as readonly string[]).includes(toolId);
  return [
    toolViewSection({
      toolId,
      id: 'connection-card',
      label: 'Connection card',
      focusConnectionDetail: 'tool-view',
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.tools.views.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
      diagnostics: ['connection-card', 'cr-readback'],
      safetyBoundaries: ['Connection card view opens do not execute provider tools or mutate external systems.'],
    }),
    toolViewSection({
      toolId,
      id: 'setup',
      label: 'Setup',
      focusConnectionDetail: 'tool-setup',
      readPaths: ['xd.xenesis.tools.setup.status', 'xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.setup.open'],
      diagnostics: ['mcp-settings-status', 'missing-env'],
      safetyBoundaries: ['Setup view opens do not write provider settings or external tool credentials.'],
    }),
    toolViewSection({
      toolId,
      id: 'connector',
      label: 'Connector readiness',
      focusConnectionDetail: 'tool-connector',
      readPaths: ['xd.xenesis.tools.connectors.status', 'xd.mcp.settings.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.connectors.open'],
      diagnostics: ['mcp-settings-status', 'missing-env'],
      safetyBoundaries: ['Connector view opens never return credential values.'],
    }),
    toolViewSection({
      toolId,
      id: 'setup-plan',
      label: 'Setup plan',
      focusConnectionDetail: 'tool-setup-plan',
      readPaths: ['xd.xenesis.tools.setupPlans.status', 'xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.setupPlans.open'],
      diagnostics: ['mcp-settings-status', 'missing-env', 'cr-readback'],
      safetyBoundaries: ['Setup plan view opens do not install MCP servers or complete OAuth.'],
    }),
    toolViewSection({
      toolId,
      id: 'install-plan',
      label: 'Install plan',
      focusConnectionDetail: 'tool-install-plan',
      readPaths: ['xd.xenesis.tools.installPlans.status', 'xd.mcp.settings.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.installPlans.open'],
      diagnostics: ['mcp-settings-status', 'template-snippet'],
      safetyBoundaries: ['Install plan view opens do not run package managers or write MCP config.'],
    }),
    ...(options.hasMcpTemplate
      ? [
          toolViewSection({
            toolId,
            id: 'mcp-template',
            label: 'MCP template',
            focusConnectionDetail: 'mcp-install-draft',
            readPaths: ['xd.xenesis.tools.mcpInstallDrafts.status', 'xd.mcp.settings.status'],
            controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.mcpInstallDrafts.open'],
            diagnostics: ['mcp-settings-status', 'template-snippet'],
            safetyBoundaries: ['MCP template view opens do not write MCP config or run installers.'],
          }),
        ]
      : []),
    ...(plannedOauth
      ? [
          toolViewSection({
            toolId,
            id: 'oauth-draft',
            label: 'OAuth draft',
            focusConnectionDetail: 'tool-oauth-draft',
            readPaths: ['xd.xenesis.tools.oauthDrafts.status', 'xd.xenesis.tools.oauthDrafts.setupPacket'],
            controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.oauthDrafts.open'],
            diagnostics: ['planned-oauth-template', 'oauth-app-registration', 'scope-review'],
            safetyBoundaries: ['OAuth draft view opens do not start OAuth flows, store tokens, or expose secrets.'],
          }),
        ]
      : []),
    toolViewSection({
      toolId,
      id: 'action-policy',
      label: 'Action policy',
      focusConnectionDetail: 'tool-action-catalog',
      readPaths: ['xd.xenesis.tools.actions.status', 'xd.xenesis.tools.connectors.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.actions.open'],
      diagnostics: ['mcp-settings-status', 'missing-env', 'cr-readback'],
      safetyBoundaries: ['Action policy view opens do not execute provider tools or approve writes.'],
    }),
    toolViewSection({
      toolId,
      id: 'user-stories',
      label: 'User stories',
      focusConnectionDetail: 'tool-user-story',
      readPaths: ['xd.xenesis.tools.userStories.status', 'xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.tools.userStories.open'],
      diagnostics: ['mcp-settings-status', 'missing-env', 'cr-readback'],
      safetyBoundaries: ['User-story view opens do not execute provider tools or mutate external systems.'],
    }),
  ];
}

function toolUserStoryTemplate(input: {
  workflowType: XenesisConnectionToolUserStoryWorkflowType;
  runtimeSupport: XenesisConnectionToolUserStoryRuntimeSupport;
  setupSurface: string;
  userStories: string[];
  prerequisiteConnectors: string[];
  requiredScopes: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
}): XenesisConnectionToolUserStoryTemplate {
  return {
    workflowType: input.workflowType,
    runtimeSupport: input.runtimeSupport,
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: input.setupSurface,
    userStories: input.userStories,
    prerequisiteConnectors: input.prerequisiteConnectors,
    requiredScopes: input.requiredScopes,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.userStories.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.guides.status',
    ],
    controlPaths: ['xd.xenesis.tools.userStories.open', 'xd.xenesis.tools.views.open', 'xd.xenesis.guides.open'],
    diagnostics: input.diagnostics,
    safetyBoundaries: input.safetyBoundaries ?? [
      'user-story workflows are read/open planning surfaces',
      'tool execution stays behind provider MCP tools and CR approval paths',
      'writes require separate verified tool actions',
    ],
  };
}

function toolActionCatalogAction(
  label: string,
  toolNames: string[],
  dataScopes: string[],
  risk: XenesisConnectionToolActionCatalogAction['risk'] = 'low',
): XenesisConnectionToolActionCatalogAction {
  return {
    label,
    toolNames,
    dataScopes,
    risk,
  };
}

function toolActionCatalogGroup(
  kind: XenesisConnectionToolActionCatalogGroupKind,
  label: string,
  approvalPolicy: XenesisConnectionToolActionCatalogApprovalPolicy,
  actions: XenesisConnectionToolActionCatalogAction[],
): XenesisConnectionToolActionCatalogGroup {
  return {
    kind,
    label,
    approvalPolicy,
    actions,
  };
}

function toolActionCatalogTemplate(input: {
  runtimeSupport: XenesisConnectionToolActionCatalogRuntimeSupport;
  groups: XenesisConnectionToolActionCatalogGroup[];
  diagnostics: string[];
  blockedActions?: string[];
  safetyBoundaries?: string[];
}): XenesisConnectionToolActionCatalogTemplate {
  return {
    runtimeSupport: input.runtimeSupport,
    actionInboxKind: 'xenesis-tool-action-policy',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    reviewSurface: 'Desk Action Inbox',
    groups: input.groups,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.actions.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.tools.userStories.status',
      'xd.xenesis.tools.installPlans.status',
    ],
    controlPaths: [
      'xd.xenesis.tools.actions.open',
      'xd.xenesis.tools.actions.request',
      'xd.xenesis.tools.views.open',
      'xd.xenesis.connections.open',
    ],
    diagnostics: input.diagnostics,
    blockedActions: input.blockedActions ?? [
      'execute provider tools',
      'run unapproved write actions',
      'complete OAuth',
      'store tokens',
      'write MCP config',
    ],
    safetyBoundaries: input.safetyBoundaries ?? [
      'tool action catalogs are review-only',
      'tool action catalog does not execute provider tools or mutate external systems',
      'write actions require separate verified approval-gated tool execution paths',
      'credentials, OAuth tokens, request payloads, and provider output are never returned',
    ],
  };
}

const IMPLEMENTED_CHANNEL_USER_STORY_READ_PATHS = [
  'xd.xenesis.connections.status',
  'xd.xenesis.channels.userStories.status',
  'xd.xenesis.channels.routing.status',
  'xd.xenesis.channels.safety.status',
  'xd.xenesis.channels.accessGroups.status',
  'xd.xenesis.channels.pairing.status',
  'xd.xenesis.gateway.status',
];

function implementedChannelUserStoryTemplate(input: {
  workflowType: Exclude<XenesisConnectionChannelUserStoryWorkflowType, 'planned-messenger' | 'planned-mailbox'>;
  userStories: string[];
  prerequisiteSetup: string[];
  diagnostics: string[];
}): XenesisConnectionChannelUserStoryTemplate {
  return {
    workflowType: input.workflowType,
    runtimeSupport: 'implemented',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    userStories: input.userStories,
    prerequisiteSetup: input.prerequisiteSetup,
    readPaths: IMPLEMENTED_CHANNEL_USER_STORY_READ_PATHS,
    controlPaths: [
      'xd.xenesis.channels.userStories.open',
      'xd.xenesis.messengers.views.open',
      'xd.xenesis.profiles.testChannel',
    ],
    diagnostics: input.diagnostics,
    safetyBoundaries: [
      'channel user stories are read/open planning surfaces',
      'message delivery stays on explicit channel test and gateway runtime paths',
      'remote prompts stay constrained by channel allowlists and approval guardrails',
    ],
  };
}

function plannedChannelUserStoryTemplate(id: string, label: string): XenesisConnectionChannelUserStoryTemplate {
  const workflowType: XenesisConnectionChannelUserStoryWorkflowType =
    id === 'email' ? 'planned-mailbox' : 'planned-messenger';
  return {
    workflowType,
    runtimeSupport: 'planned-adapter',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > Xenesis Agent > Connections',
    userStories: [
      `review the ${label} channel setup story before selecting an adapter`,
      `define allowed ${workflowType === 'planned-mailbox' ? 'senders and folders' : 'accounts, chats, or rooms'} before accepting remote prompts`,
      'keep delivery disabled until a verified gateway adapter and safety review exist',
    ],
    prerequisiteSetup: [`${id}-adapter-selected`, `${id}-pairing-ready`, `${id}-allowlist-defined`],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.userStories.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.messengers.views.status',
      'xd.xenesis.guides.status',
    ],
    controlPaths: [
      'xd.xenesis.channels.userStories.open',
      'xd.xenesis.messengers.views.open',
      'xd.xenesis.connections.open',
    ],
    diagnostics: ['planned-adapter', 'pairing-required', 'safety-review', 'delivery-disabled'],
    safetyBoundaries: [
      'planned messenger user stories do not enable delivery',
      'planned adapters remain read/open planning surfaces until runtime support exists',
      'message delivery and replies require separate verified gateway paths',
    ],
  };
}

function toolInstallPlanTemplate(input: {
  installMode: XenesisConnectionToolInstallPlanMode;
  runtimeSupport: XenesisConnectionToolInstallPlanRuntimeSupport;
  setupSurface: string;
  installSurface?: string;
  installActions: string[];
  installSteps: string[];
  configTargets: string[];
  requiredEnv?: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
}): XenesisConnectionToolInstallPlanTemplate {
  return {
    installMode: input.installMode,
    runtimeSupport: input.runtimeSupport,
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: input.setupSurface,
    installSurface: input.installSurface ?? input.setupSurface,
    installActions: input.installActions,
    installSteps: input.installSteps,
    configTargets: input.configTargets,
    requiredEnv: input.requiredEnv ?? [],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.installPlans.status',
      'xd.xenesis.tools.setup.status',
      'xd.xenesis.tools.connectors.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.installPlans.open', 'xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
    diagnostics: input.diagnostics,
    safetyBoundaries: input.safetyBoundaries ?? [
      'install plans are read/open planning surfaces',
      'install plans do not execute shell commands or mutate MCP settings',
      'secret values are never stored or returned',
      'tool writes require separate verified approval-gated actions',
    ],
  };
}

type XenesisConnectionToolConnectorCredentialRefInput = Omit<XenesisConnectionToolConnectorCredentialRef, 'state'>;

function toolConnectorCredentialState(
  ref: XenesisConnectionToolConnectorCredentialRefInput,
  runtimeSupport: XenesisConnectionToolConnectorTemplate['runtimeSupport'],
  env: Record<string, string | undefined>,
): XenesisConnectionToolConnectorCredentialState {
  if (runtimeSupport === 'planned-oauth') return 'planned';
  if (ref.source === 'none') return 'not-required';
  if (ref.source === 'oauth-client' && !ref.required) return 'not-required';
  if (ref.source === 'workspace-config' && !ref.required) return 'not-required';
  if (!ref.required) return 'not-required';
  return env[ref.ref]?.trim() ? 'configured' : 'missing';
}

function aggregateToolCredentialState(
  refs: XenesisConnectionToolConnectorCredentialRef[],
  runtimeSupport: XenesisConnectionToolConnectorTemplate['runtimeSupport'],
): XenesisConnectionToolConnectorCredentialState {
  if (runtimeSupport === 'planned-oauth') return 'planned';
  if (refs.length === 0) return 'not-required';
  if (refs.some((ref) => ref.required && ref.state === 'missing')) return 'missing';
  if (refs.some((ref) => ref.required && ref.state === 'configured')) return 'configured';
  return 'not-required';
}

function withToolConnectorCredentialState(
  connector: XenesisConnectionToolConnectorTemplate,
  env: Record<string, string | undefined>,
): XenesisConnectionToolConnectorTemplate {
  const credentialRefs = connector.credentialRefs.map((ref) => ({
    ...ref,
    state: toolConnectorCredentialState(ref, connector.runtimeSupport, env),
  }));
  return {
    ...connector,
    credentialRefs,
    credentialState: aggregateToolCredentialState(credentialRefs, connector.runtimeSupport),
  };
}

function toolConnectorTemplate(input: {
  connectorType: XenesisConnectionToolConnectorTemplate['connectorType'];
  authMode: XenesisConnectionToolConnectorTemplate['authMode'];
  runtimeSupport: XenesisConnectionToolConnectorTemplate['runtimeSupport'];
  credentialRefs?: XenesisConnectionToolConnectorCredentialRefInput[];
  dataScopes: string[];
  writeScopes: string[];
  setupSurface: string;
  validationChecks: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
}): XenesisConnectionToolConnectorTemplate {
  const credentialRefs = (input.credentialRefs ?? []).map((ref) => ({
    ...ref,
    state: toolConnectorCredentialState(ref, input.runtimeSupport, {}),
  }));
  return {
    connectorType: input.connectorType,
    authMode: input.authMode,
    runtimeSupport: input.runtimeSupport,
    credentialRefs,
    credentialState: aggregateToolCredentialState(credentialRefs, input.runtimeSupport),
    dataScopes: [...input.dataScopes],
    writeScopes: [...input.writeScopes],
    setupSurface: input.setupSurface,
    validationChecks: input.validationChecks,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.connectors.open', 'xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
    diagnostics: input.diagnostics,
    safetyBoundaries: input.safetyBoundaries ?? [
      'credential values are never returned',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  };
}

const TOOL_CONNECTIONS: XenesisConnectionItem[] = [
  {
    id: 'fetch',
    kind: 'tool',
    label: 'Fetch',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for reading web pages as model context.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    mcpTemplate: mcpTemplateFor('fetch'),
    toolView: toolViewTemplate('fetch', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the Fetch MCP template into the selected local CLI MCP config',
        'verify uvx can resolve mcp-server-fetch in the provider runtime environment',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      diagnostics: ['mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'mcp-stdio',
      authMode: 'none',
      runtimeSupport: 'ready-template',
      dataScopes: ['webpage:read'],
      writeScopes: [],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'fetch-known-url', 'cr-readback'],
      diagnostics: ['mcp-settings-status', 'template-snippet'],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'web-context',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'read a user-provided URL before answering a question',
        'summarize fetched page content with source context',
        'avoid external writes because Fetch is read-only context',
      ],
      prerequisiteConnectors: ['fetch'],
      requiredScopes: ['webpage:read'],
      diagnostics: ['mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'ready-template',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction('Fetch and search user-provided web pages', ['fetch'], ['webpage:read'], 'low'),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction('Read fetched page content as model context', ['fetch'], ['webpage:read'], 'low'),
        ]),
      ],
      diagnostics: ['mcp-settings-status', 'template-snippet', 'fetch-known-url', 'cr-readback'],
    }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'none',
      dataScopes: ['webpage:read'],
      writeScopes: [],
      credentialStorage: 'none',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'fetch-known-url', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['verify fetched content source', 'avoid sending private URLs to untrusted providers'],
    },
    setupSteps: [
      'Install the Fetch MCP server in the local CLI MCP settings.',
      'Verify the MCP bridge and provider CLI can list the fetch tools before relying on web context.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'filesystem',
    kind: 'tool',
    label: 'Filesystem',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for workspace-scoped file reads.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    mcpTemplate: mcpTemplateFor('filesystem'),
    toolView: toolViewTemplate('filesystem', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the Filesystem MCP template into the selected local CLI MCP config',
        'set the workspace root scope before enabling filesystem reads',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      diagnostics: ['workspace-scope', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'mcp-stdio',
      authMode: 'none',
      runtimeSupport: 'ready-template',
      dataScopes: ['workspace:read-files', 'workspace:list-files', 'workspace:search-files'],
      writeScopes: [],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'workspace-directory-list', 'cr-readback'],
      diagnostics: ['workspace-scope', 'mcp-settings-status', 'template-snippet'],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'workspace-context',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'read workspace files before planning an agent task',
        'search project files for relevant implementation context',
        'route file writes through Desk CR approval paths',
      ],
      prerequisiteConnectors: ['filesystem'],
      requiredScopes: ['workspace:read-files', 'workspace:list-files', 'workspace:search-files'],
      diagnostics: ['workspace-scope', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'ready-template',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction(
            'Search workspace files within the configured root',
            ['search_files'],
            ['workspace:search-files'],
            'low',
          ),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'List and read workspace-scoped files',
            ['list_directory', 'directory_tree', 'read_file'],
            ['workspace:list-files', 'workspace:read-files'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'approval-gated', [
          toolActionCatalogAction(
            'Route workspace file writes through Desk CR approval paths',
            ['xd.files.write', 'xd.safeFile.apply'],
            ['workspace:write-files'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['workspace-scope', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
      blockedActions: [
        'execute provider tools',
        'write files outside the active workspace',
        'run unapproved file writes',
        'store tokens',
        'write MCP config',
      ],
    }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'none',
      dataScopes: ['workspace:read-files', 'workspace:list-files', 'workspace:search-files'],
      writeScopes: [],
      credentialStorage: 'workspace root in MCP config',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'workspace-directory-list', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['scope filesystem to the active workspace', 'route writes through Desk approval paths'],
    },
    setupSteps: [
      'Install the filesystem MCP server with the active workspace root as its only scope.',
      'Keep write operations routed through Xenesis Desk CR paths so approval and audit records stay aligned.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'github',
    kind: 'tool',
    label: 'GitHub',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for repositories, issues, and pull requests.',
    requiredEnv: ['GITHUB_TOKEN'],
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    mcpTemplate: mcpTemplateFor('github'),
    toolView: toolViewTemplate('github', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the GitHub MCP template into the selected local CLI MCP config',
        'set GITHUB_TOKEN in the provider runtime environment',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['GITHUB_TOKEN'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'mcp-stdio',
      authMode: 'env-token',
      runtimeSupport: 'ready-template',
      credentialRefs: [{ ref: 'GITHUB_TOKEN', source: 'env', required: true }],
      dataScopes: ['github:search-code', 'github:read-repos', 'github:read-issues', 'github:read-pull-requests'],
      writeScopes: ['github:writes-disabled-until-approved'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'github-repo-read', 'cr-readback'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet'],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'repo-triage',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'inspect repository context before a coding task',
        'triage related issues and pull requests as task context',
        'draft repository changes only after approval-gated write tooling exists',
      ],
      prerequisiteConnectors: ['github'],
      requiredScopes: ['github:search-code', 'github:read-repos', 'github:read-issues', 'github:read-pull-requests'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'ready-template',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction(
            'Search repositories, code, issues, and pull requests',
            ['search_code', 'search_repositories', 'search_issues', 'search_pull_requests'],
            ['github:search-code', 'github:read-issues', 'github:read-pull-requests'],
            'low',
          ),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'Read repository, issue, pull request, release, and security context',
            ['get_file_contents', 'list_issues', 'get_issue', 'get_pull_request', 'list_releases'],
            ['github:read-repos', 'github:read-issues', 'github:read-pull-requests'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'approval-gated', [
          toolActionCatalogAction(
            'Draft repository, issue, or pull request changes after approval',
            ['create_issue', 'update_issue', 'create_pull_request', 'add_issue_comment'],
            ['github:writes-disabled-until-approved'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['github:search-code', 'github:read-repos', 'github:read-issues', 'github:read-pull-requests'],
      writeScopes: ['github:writes-disabled-until-approved'],
      credentialStorage: 'GITHUB_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'github-repo-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['use narrow repository scopes', 'verify read tools before writes'],
    },
    setupSteps: [
      'Create a GitHub token with the narrow repository scopes needed for the workspace.',
      'Set GITHUB_TOKEN in the environment used by the provider CLI or MCP server.',
      'Install the GitHub MCP server and verify repository read tools before enabling write workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for Notion pages and databases.',
    requiredEnv: ['NOTION_TOKEN'],
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    mcpTemplate: mcpTemplateFor('notion'),
    toolView: toolViewTemplate('notion', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the Notion MCP template into the selected local CLI MCP config',
        'set NOTION_TOKEN in the provider runtime environment',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'mcp-stdio',
      authMode: 'env-token',
      runtimeSupport: 'ready-template',
      credentialRefs: [{ ref: 'NOTION_TOKEN', source: 'env', required: true }],
      dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'notion-search-read', 'cr-readback'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet'],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'knowledge-capture',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'search Notion pages before answering a workspace question',
        'summarize a selected Notion database as task context',
        'draft Notion updates only after approval-gated write tooling exists',
      ],
      prerequisiteConnectors: ['notion'],
      requiredScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'ready-template',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction('Search Notion pages and databases', ['search'], ['notion:search'], 'low'),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'Read Notion pages and database context',
            ['get_page', 'get_database', 'get_block_children'],
            ['notion:read-pages', 'notion:read-databases'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'approval-gated', [
          toolActionCatalogAction(
            'Draft Notion updates after approval',
            ['create_page', 'update_page', 'append_block_children'],
            ['notion:writes-disabled-until-approved'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      credentialStorage: 'NOTION_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'notion-search-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['share only required pages/databases', 'verify read tools before writes'],
    },
    setupSteps: [
      'Create a Notion integration and share the needed pages or databases with it.',
      'Set NOTION_TOKEN in the environment used by the provider CLI or MCP server.',
      'Install the Notion MCP server and verify search/read tools before adding write workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'linear',
    kind: 'tool',
    label: 'Linear',
    status: 'needs-setup',
    summary: 'Recommended OAuth MCP tool for Linear issues and projects.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    mcpTemplate: mcpTemplateFor('linear'),
    toolView: toolViewTemplate('linear', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'oauth-template',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: [
        'open-local-cli-mcp-settings',
        'copy-json-mcp-config',
        'copy-codex-toml-config',
        'review-oauth-consent',
      ],
      installSteps: [
        'copy the Linear hosted MCP endpoint into the selected local CLI MCP config',
        'complete OAuth in the browser when the provider MCP client prompts for it',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      diagnostics: ['oauth-client', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'mcp-http',
      authMode: 'oauth',
      runtimeSupport: 'ready-template',
      credentialRefs: [{ ref: 'LINEAR_OAUTH_TOKEN_STORE', source: 'oauth-client', required: false }],
      dataScopes: ['linear:read-issues', 'linear:read-projects', 'linear:read-comments'],
      writeScopes: ['linear:update-issues-after-approval', 'linear:create-comments-after-approval'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'oauth-authorized', 'linear-issue-read'],
      diagnostics: ['oauth-client', 'mcp-settings-status', 'template-snippet'],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'task-triage',
      runtimeSupport: 'ready-template',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'read Linear issues before planning work',
        'summarize project status as agent task context',
        'draft issue updates only after approval-gated write tooling exists',
      ],
      prerequisiteConnectors: ['linear'],
      requiredScopes: ['linear:read-issues', 'linear:read-projects', 'linear:read-comments'],
      diagnostics: ['oauth-client', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'ready-template',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction(
            'Find Linear issues, teams, projects, and comments',
            ['find_issues', 'find_teams', 'find_projects'],
            ['linear:read-issues', 'linear:read-projects'],
            'low',
          ),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'Read Linear issue, project, team, and user details',
            ['get_issue', 'list_projects', 'get_project', 'list_teams', 'get_user'],
            ['linear:read-issues', 'linear:read-projects', 'linear:read-comments'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'approval-gated', [
          toolActionCatalogAction(
            'Draft Linear issue updates and comments after approval',
            ['update_issue', 'create_comment', 'create_issue'],
            ['linear:update-issues-after-approval', 'linear:create-comments-after-approval'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['oauth-client', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    }),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['linear:read-issues', 'linear:read-projects', 'linear:read-comments'],
      writeScopes: ['linear:update-issues-after-approval', 'linear:create-comments-after-approval'],
      credentialStorage: 'OAuth token managed by the MCP client',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'oauth-authorized', 'linear-issue-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['complete OAuth in the browser', 'keep issue updates approval-gated'],
    },
    setupSteps: [
      'Add the Linear hosted MCP endpoint to the provider CLI or local MCP config.',
      'Complete the OAuth flow in the browser when the provider asks for authorization.',
      'Verify issue/project read tools before enabling update workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'google-workspace',
    kind: 'tool',
    label: 'Google Workspace',
    status: 'planned',
    summary: 'Planned MCP connection for Google Workspace after a verified template is selected.',
    settingsTarget: 'mcp',
    supportLevel: 'planned',
    crActions: [],
    toolView: toolViewTemplate('google-workspace', 'Settings > AI Provider > Local CLI MCP'),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'planned-oauth',
      runtimeSupport: 'planned-oauth',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: [],
      installSteps: [
        'select a verified Google Workspace MCP server with OAuth support',
        'review Gmail, Drive, and Docs read-only OAuth scopes before install actions exist',
        'verify read-only workspace context before enabling write workflows',
      ],
      configTargets: [],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      safetyBoundaries: [
        'planned OAuth install plans do not complete OAuth or send email',
        'install plans are read/open planning surfaces',
        'secret values are never stored or returned',
        'tool writes require separate verified approval-gated actions',
      ],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'oauth-mcp',
      authMode: 'oauth',
      runtimeSupport: 'planned-oauth',
      credentialRefs: [{ ref: 'GOOGLE_OAUTH_TOKEN_STORE', source: 'oauth-client', required: false }],
      dataScopes: ['google-drive.readonly', 'gmail.readonly', 'documents.readonly'],
      writeScopes: ['google-writes-disabled-until-template-verified'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['oauth-consent-reviewed', 'credential-state-redacted', 'drive-list-read', 'cr-readback'],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status'],
      safetyBoundaries: [
        'credential values are never returned',
        'planned OAuth connector exposes readiness only until a verified MCP template exists',
      ],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'inbox-triage',
      runtimeSupport: 'planned-oauth',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'summarize unread inbox context before an agent task',
        'read Drive and Docs context with reviewed OAuth scopes',
        'draft email or document actions only after verified approval gates exist',
      ],
      prerequisiteConnectors: ['google-workspace'],
      requiredScopes: ['gmail.readonly', 'google-drive.readonly', 'documents.readonly'],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      safetyBoundaries: [
        'planned OAuth inbox workflows do not send email or mutate documents',
        'user-story workflows are read/open planning surfaces',
        'writes require separate verified tool actions',
      ],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'planned-oauth',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction(
            'Search Gmail and Google Drive context after OAuth is verified',
            ['gmail_search_messages', 'google_drive_search'],
            ['gmail.readonly', 'google-drive.readonly'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'Read Gmail, Drive, and Docs context with reviewed scopes',
            ['gmail_get_profile', 'gmail_read_message', 'google_drive_fetch', 'google_drive_export'],
            ['gmail.readonly', 'google-drive.readonly', 'documents.readonly'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'blocked-until-verified', [
          toolActionCatalogAction(
            'Draft email or document changes only after verified approval gates exist',
            ['gmail_send_message', 'google_docs_update_document'],
            ['google-writes-disabled-until-template-verified'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      blockedActions: [
        'execute provider tools',
        'send email',
        'update Google documents',
        'complete OAuth',
        'store tokens',
        'write MCP config',
      ],
    }),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['google-drive.readonly', 'gmail.readonly', 'documents.readonly'],
      writeScopes: ['google-writes-disabled-until-template-verified'],
      credentialStorage: 'OAuth token store from the selected MCP server',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['oauth-consent-reviewed', 'drive-list-read', 'gmail-profile-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['review OAuth consent scopes', 'prefer read-only workspace scopes until writes are verified'],
    },
    setupSteps: [
      'Choose a verified Google Workspace MCP server with OAuth support before exposing install actions.',
      'Keep OAuth consent, token storage, and workspace data scopes visible in the setup view.',
      'Prefer read-only Drive/Gmail/Docs scopes until write approval behavior is verified.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    warnings: ['No verified install template is bundled yet.'],
  },
  {
    id: 'google-calendar',
    kind: 'tool',
    label: 'Google Calendar',
    status: 'planned',
    summary: 'Planned MCP connection for calendar context and scheduling workflows.',
    settingsTarget: 'mcp',
    supportLevel: 'planned',
    crActions: [],
    toolView: toolViewTemplate('google-calendar', 'Settings > AI Provider > Local CLI MCP'),
    toolInstallPlan: toolInstallPlanTemplate({
      installMode: 'planned-oauth',
      runtimeSupport: 'planned-oauth',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: [],
      installSteps: [
        'select a verified Google Calendar MCP server with OAuth support',
        'review calendar read-only OAuth scopes before install actions exist',
        'verify calendar listing before enabling event mutation workflows',
      ],
      configTargets: [],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      safetyBoundaries: [
        'planned OAuth install plans do not complete OAuth or create calendar events',
        'install plans are read/open planning surfaces',
        'secret values are never stored or returned',
        'tool writes require separate verified approval-gated actions',
      ],
    }),
    toolConnector: toolConnectorTemplate({
      connectorType: 'oauth-mcp',
      authMode: 'oauth',
      runtimeSupport: 'planned-oauth',
      credentialRefs: [{ ref: 'GOOGLE_OAUTH_TOKEN_STORE', source: 'oauth-client', required: false }],
      dataScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly', 'calendar.freebusy.readonly'],
      writeScopes: ['calendar-writes-disabled-until-template-verified'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['oauth-consent-reviewed', 'credential-state-redacted', 'calendar-list-read', 'cr-readback'],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status'],
      safetyBoundaries: [
        'credential values are never returned',
        'planned OAuth connector exposes readiness only until a verified MCP template exists',
      ],
    }),
    toolUserStory: toolUserStoryTemplate({
      workflowType: 'calendar-context',
      runtimeSupport: 'planned-oauth',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'inspect upcoming meetings before an agent task',
        'summarize calendar context with read-only scopes',
        'draft scheduling actions only after explicit approval gates exist',
      ],
      prerequisiteConnectors: ['google-calendar'],
      requiredScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly', 'calendar.freebusy.readonly'],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      safetyBoundaries: [
        'planned OAuth calendar workflows do not create, update, or delete events',
        'user-story workflows are read/open planning surfaces',
        'writes require separate verified tool actions',
      ],
    }),
    toolActionCatalog: toolActionCatalogTemplate({
      runtimeSupport: 'planned-oauth',
      groups: [
        toolActionCatalogGroup('search', 'Search actions', 'read-only', [
          toolActionCatalogAction(
            'Find free time, meeting times, and calendar users after OAuth is verified',
            ['gcal_find_my_free_time', 'gcal_find_meeting_times', 'gcal_find_user_emails'],
            ['calendar.freebusy.readonly', 'calendar.events.readonly'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('read', 'Read actions', 'read-only', [
          toolActionCatalogAction(
            'List calendars and read calendar events with reviewed scopes',
            ['gcal_list_calendars', 'gcal_list_events', 'gcal_get_event'],
            ['calendar.calendarlist.readonly', 'calendar.events.readonly'],
            'medium',
          ),
        ]),
        toolActionCatalogGroup('write', 'Write actions', 'blocked-until-verified', [
          toolActionCatalogAction(
            'Draft calendar event create/update/delete actions only after verified approval gates exist',
            ['gcal_create_event', 'gcal_update_event', 'gcal_delete_event'],
            ['calendar-writes-disabled-until-template-verified'],
            'high',
          ),
        ]),
      ],
      diagnostics: ['planned-oauth-template', 'mcp-settings-status', 'scope-review', 'cr-readback'],
      blockedActions: [
        'execute provider tools',
        'create/update/delete calendar events without approval',
        'complete OAuth',
        'store tokens',
        'write MCP config',
      ],
    }),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly', 'calendar.freebusy.readonly'],
      writeScopes: ['calendar-writes-disabled-until-template-verified'],
      credentialStorage: 'OAuth token store from the selected MCP server',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['oauth-consent-reviewed', 'calendar-list-read', 'calendar-events-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['review calendar scopes before scheduling', 'keep create/update/delete approval-gated'],
    },
    setupSteps: [
      'Select a verified Google Calendar MCP/OAuth server before exposing install actions.',
      'Require explicit calendar scope review before scheduling or event mutation is enabled.',
      'Verify read-only calendar listing before enabling create/update/delete workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    warnings: ['No verified install template is bundled yet.'],
  },
];

export const XENESIS_CONNECTION_TOOL_IDS = TOOL_CONNECTIONS.map((item) => item.id);

type XenesisConnectionChannelPairingCredentialRefInput = Omit<XenesisConnectionChannelPairingCredentialRef, 'state'>;

function aggregateChannelPairingState(
  refs: XenesisConnectionChannelPairingCredentialRef[],
  runtimeSupport: XenesisConnectionChannelPairingRuntimeSupport,
): XenesisConnectionChannelPairingState {
  if (runtimeSupport === 'planned-adapter') return 'planned';
  if (refs.length === 0) return 'not-required';
  if (refs.some((ref) => ref.required && ref.state === 'missing')) return 'missing';
  if (refs.some((ref) => ref.required && ref.state === 'unknown')) return 'unknown';
  if (refs.some((ref) => ref.required && ref.state === 'configured')) return 'configured';
  return 'not-required';
}

function channelPairingTemplate(input: {
  model: XenesisConnectionChannelPairingModel;
  runtimeSupport: XenesisConnectionChannelPairingRuntimeSupport;
  accountScope: XenesisConnectionChannelPairingTemplate['accountScope'];
  credentialRefs: XenesisConnectionChannelPairingCredentialRefInput[];
  setupSurface: string;
  validationChecks: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
}): XenesisConnectionChannelPairingTemplate {
  const credentialRefs = input.credentialRefs.map((ref) => ({
    ...ref,
    state: input.runtimeSupport === 'planned-adapter' ? ('planned' as const) : ('unknown' as const),
  }));
  return {
    model: input.model,
    runtimeSupport: input.runtimeSupport,
    accountScope: input.accountScope,
    credentialRefs,
    pairingState: aggregateChannelPairingState(credentialRefs, input.runtimeSupport),
    setupSurface: input.setupSurface,
    validationChecks: input.validationChecks,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.status',
    ],
    controlPaths: input.controlPaths,
    diagnostics: input.diagnostics,
    safetyBoundaries: input.safetyBoundaries ?? [
      'pairing status is read-only',
      'credential values are never returned',
      'channel writes stay on profile update CR paths',
      'delivery tests stay on profile test CR paths',
    ],
  };
}

function implementedChannelPairingTemplate(input: {
  model: XenesisConnectionChannelPairingModel;
  accountScope: XenesisConnectionChannelPairingTemplate['accountScope'];
  credentialRefs: XenesisConnectionChannelPairingCredentialRefInput[];
}): XenesisConnectionChannelPairingTemplate {
  return channelPairingTemplate({
    ...input,
    runtimeSupport: 'implemented',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    validationChecks: ['profile-env-field-set', 'env-secret-configured', 'gateway-channel-ready', 'cr-readback'],
    controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
    diagnostics: ['missing-env', 'pairing-secret-state', 'gateway-status', 'last-error'],
  });
}

function plannedChannelPairingTemplate(id: string): XenesisConnectionChannelPairingTemplate {
  const deviceChannels = new Set(['whatsapp', 'signal', 'wechat', 'qqbot', 'zalo']);
  const oauthChannels = new Set(['microsoft-teams', 'google-chat', 'feishu']);
  if (deviceChannels.has(id)) {
    return channelPairingTemplate({
      model: 'device-link',
      runtimeSupport: 'planned-adapter',
      accountScope: 'device',
      credentialRefs: [
        { ref: `${id.toUpperCase().replace(/-/g, '_')}_DEVICE_LINK`, source: 'device-pairing', required: true },
      ],
      setupSurface: 'Settings > Xenesis Agent > Connections',
      validationChecks: ['adapter-selected', 'device-pairing-approved', 'allowlist-reviewed', 'cr-readback'],
      controlPaths: ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
      diagnostics: ['planned-adapter', 'device-pairing-required', 'safety-review'],
      safetyBoundaries: [
        'planned pairing status is read-only',
        'no QR or device-link session is created until runtime support exists',
        'planned channel delivery remains disabled',
      ],
    });
  }
  if (oauthChannels.has(id)) {
    return channelPairingTemplate({
      model: 'oauth-app',
      runtimeSupport: 'planned-adapter',
      accountScope: 'workspace-app',
      credentialRefs: [
        { ref: `${id.toUpperCase().replace(/-/g, '_')}_OAUTH_APP`, source: 'oauth-client', required: true },
      ],
      setupSurface: 'Settings > Xenesis Agent > Connections',
      validationChecks: ['app-registration-reviewed', 'oauth-consent-reviewed', 'allowlist-reviewed', 'cr-readback'],
      controlPaths: ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
      diagnostics: ['planned-adapter', 'oauth-app-required', 'safety-review'],
      safetyBoundaries: [
        'planned pairing status is read-only',
        'no OAuth flow is started until runtime support exists',
        'planned channel delivery remains disabled',
      ],
    });
  }
  if (id === 'imessage') {
    return channelPairingTemplate({
      model: 'desktop-bridge',
      runtimeSupport: 'planned-adapter',
      accountScope: 'desktop-host',
      credentialRefs: [{ ref: 'IMESSAGE_DESKTOP_HOST', source: 'desktop-host', required: true }],
      setupSurface: 'Settings > Xenesis Agent > Connections',
      validationChecks: ['desktop-host-reviewed', 'recipient-allowlist-reviewed', 'cr-readback'],
      controlPaths: ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
      diagnostics: ['planned-adapter', 'desktop-host-required', 'safety-review'],
      safetyBoundaries: [
        'planned pairing status is read-only',
        'no host pairing or bridge session is created until runtime support exists',
        'planned channel delivery remains disabled',
      ],
    });
  }
  if (id === 'email') {
    return channelPairingTemplate({
      model: 'mailbox',
      runtimeSupport: 'planned-adapter',
      accountScope: 'mailbox',
      credentialRefs: [{ ref: 'EMAIL_MAILBOX_AUTH', source: 'mailbox', required: true }],
      setupSurface: 'Settings > Xenesis Agent > Connections',
      validationChecks: ['mailbox-provider-reviewed', 'sender-allowlist-reviewed', 'cr-readback'],
      controlPaths: ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
      diagnostics: ['planned-adapter', 'mailbox-auth-required', 'safety-review'],
      safetyBoundaries: [
        'planned pairing status is read-only',
        'no mailbox session is created until runtime support exists',
        'planned channel delivery remains disabled',
      ],
    });
  }
  return channelPairingTemplate({
    model: id === 'home-assistant' || id === 'ntfy' ? 'local-network' : 'provider-webhook',
    runtimeSupport: 'planned-adapter',
    accountScope: id === 'home-assistant' || id === 'ntfy' ? 'local-network' : 'provider-account',
    credentialRefs: [
      { ref: `${id.toUpperCase().replace(/-/g, '_')}_PAIRING`, source: 'provider-account', required: true },
    ],
    setupSurface: 'Settings > Xenesis Agent > Connections',
    validationChecks: ['adapter-selected', 'auth-reviewed', 'allowlist-reviewed', 'cr-readback'],
    controlPaths: ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
    diagnostics: ['planned-adapter', 'pairing-required', 'safety-review'],
    safetyBoundaries: [
      'planned pairing status is read-only',
      'no provider account pairing is started until runtime support exists',
      'planned channel delivery remains disabled',
    ],
  });
}

function plannedChannelGuardTemplates(
  id: string,
  label: string,
): Pick<XenesisConnectionChannelTemplate, 'routing' | 'safety' | 'accessGroups'> {
  const field = 'plannedAllowedRoutes';
  const readPaths = [
    'xd.xenesis.connections.status',
    'xd.xenesis.channels.routing.status',
    'xd.xenesis.channels.safety.status',
    'xd.xenesis.channels.accessGroups.status',
    'xd.xenesis.channels.pairing.status',
    'xd.xenesis.messengers.views.status',
  ];
  const controlPaths = [
    'xd.xenesis.channels.routing.open',
    'xd.xenesis.channels.safety.open',
    'xd.xenesis.channels.accessGroups.open',
    'xd.xenesis.messengers.views.open',
    'xd.xenesis.connections.open',
  ];
  const diagnostics = ['planned-adapter', 'routing-review-required', 'allowlist-review-required', 'delivery-disabled'];
  const safetyBoundaries = [
    'planned channel routing and safety are review metadata only',
    'planned channel delivery remains disabled',
    'planned channel settings are not mutated from guard readbacks',
    'planned channel credentials are never returned',
  ];

  return {
    routing: {
      routeBinding: `${id}.plannedRoute`,
      allowlistFields: [field],
      pairing: `${label} planned pairing review`,
      defaultAgent: 'xenesis-agent',
      sessionScope: 'planned-channel',
      diagnostics,
      deliveryFeatures: ['delivery-disabled'],
    },
    safety: {
      accessModel: 'allowlist',
      accessGroupFields: [field],
      inboundBoundary: `${label} planned sender, room, space, or tenant allowlist`,
      outboundBoundary: `${label} delivery disabled until adapter verification`,
      loopProtection: [
        'planned delivery remains disabled',
        'review bot-loop behavior before enabling runtime support',
        'verify sanitized delivery tests only after a concrete adapter exists',
      ],
      approvalGuardrails: ['readonly'],
      troubleshooting: ['planned-adapter', 'routing-review-required', 'pairing-review-required', 'delivery-disabled'],
      readPaths,
      controlPaths,
      safetyBoundaries: ['safety status is read-only', ...safetyBoundaries],
    },
    accessGroups: {
      model: 'profile-allowlist-fields',
      groupScope: 'channel',
      failClosed: true,
      bindings: [
        {
          groupId: `${id}-planned-routes`,
          field,
          required: true,
          emptyDiagnostic: 'planned route allowlist is not configured',
          description: `Planned ${label} route, sender, room, or tenant allowlist for future delivery.`,
        },
      ],
      diagnostics,
      readPaths,
      controlPaths,
      safetyBoundaries: [
        'access-group status is read-only',
        'raw planned route, sender, room, tenant, and endpoint values are never returned',
        'planned channel delivery remains disabled',
        'planned channel settings are not mutated from access-group readbacks',
      ],
    },
  };
}

const MESSENGERS: Array<{
  id: XenesisProfileChannelName;
  label: string;
  setupSteps: string[];
  sourceDocs: XenesisConnectionSourceDoc[];
  channelTemplate: XenesisConnectionChannelTemplate;
}> = [
  {
    id: 'telegram',
    label: 'Telegram',
    setupSteps: [
      'Create a Telegram bot token and store it in the configured token environment variable.',
      'Limit allowed chat IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Telegram', url: 'https://docs.openclaw.ai/channels/telegram' }],
    channelTemplate: {
      category: 'consumer',
      adapter: 'bot-api',
      auth: 'bot token',
      capabilities: ['direct-messages', 'groups', 'files'],
      safetyControls: ['allowlist', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'telegram.allowedChatIds',
        allowlistFields: ['allowedChatIds'],
        pairing: 'bot token',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'chat',
        diagnostics: ['missing-env', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['direct-messages', 'groups', 'files'],
      },
      safety: {
        accessModel: 'allowlist',
        accessGroupFields: ['allowedChatIds'],
        inboundBoundary: 'telegram chat allowlist',
        outboundBoundary: 'same chat scope as inbound route',
        loopProtection: [
          'ignore messages authored by the bot account',
          'avoid channels where Xenesis can receive its own outbound messages',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'allowlist-empty', 'safe-to-deliver', 'last-error', 'gateway-status'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: [
          'xd.panes.settings.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
        ],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
      accessGroups: {
        model: 'profile-allowlist-fields',
        groupScope: 'chat',
        failClosed: true,
        bindings: [
          {
            groupId: 'telegram-allowed-chats',
            field: 'allowedChatIds',
            required: true,
            emptyDiagnostic: 'allowedChatIds is empty',
            description: 'Telegram chat ids allowed to deliver prompts.',
          },
        ],
        diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.accessGroups.status',
          'xd.xenesis.channels.safety.status',
          'xd.xenesis.status',
        ],
        controlPaths: [
          'xd.panes.settings.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
        ],
        safetyBoundaries: [
          'access-group status is read-only',
          'raw chat, channel, guild, and endpoint values are never returned',
          'empty required allowlists fail closed before delivery',
          'channel writes stay on profile update CR paths',
        ],
      },
      pairing: implementedChannelPairingTemplate({
        model: 'env-token',
        accountScope: 'bot-account',
        credentialRefs: [{ ref: 'tokenEnv', source: 'profile-env-field', required: true }],
      }),
      userStory: implementedChannelUserStoryTemplate({
        workflowType: 'remote-prompt',
        userStories: [
          'receive an allowed Telegram chat prompt and route it to Xenesis Agent',
          'reply in the same chat scope after approval policy checks',
          'run a sanitized channel test before relying on remote prompts',
        ],
        prerequisiteSetup: ['gateway-running', 'telegram-pairing-ready', 'telegram-allowlist-configured'],
        diagnostics: ['gateway-status', 'safe-to-deliver', 'allowlist-empty', 'last-error'],
      }),
    },
  },
  {
    id: 'slack',
    label: 'Slack',
    setupSteps: [
      'Create a Slack app with bot token, signing secret, and optional webhook URL.',
      'Limit allowed channel IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Slack', url: 'https://docs.openclaw.ai/channels/slack' }],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-api',
      auth: 'bot token and signing secret',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['allowlist', 'signature-verification', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'slack.allowedChannelIds',
        allowlistFields: ['allowedChannelIds'],
        pairing: 'Slack app bot token and signing secret',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'channel-thread',
        diagnostics: ['missing-env', 'signature-check', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['channels', 'threads', 'files'],
      },
      safety: {
        accessModel: 'signature-verified',
        accessGroupFields: ['allowedChannelIds'],
        inboundBoundary: 'slack channel allowlist and signing secret',
        outboundBoundary: 'same channel or thread scope as inbound route',
        loopProtection: [
          'ignore messages authored by the Slack bot user',
          'avoid channels where Xenesis can receive its own webhook output',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'signature-check', 'allowlist-empty', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
      accessGroups: {
        model: 'profile-allowlist-fields',
        groupScope: 'channel',
        failClosed: true,
        bindings: [
          {
            groupId: 'slack-allowed-channels',
            field: 'allowedChannelIds',
            required: true,
            emptyDiagnostic: 'allowedChannelIds is empty',
            description: 'Slack channel ids allowed to deliver prompts.',
          },
        ],
        diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.accessGroups.status',
          'xd.xenesis.channels.safety.status',
          'xd.xenesis.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'access-group status is read-only',
          'raw chat, channel, guild, and endpoint values are never returned',
          'empty required allowlists fail closed before delivery',
          'channel writes stay on profile update CR paths',
        ],
      },
      pairing: implementedChannelPairingTemplate({
        model: 'env-token-signature',
        accountScope: 'bot-account',
        credentialRefs: [
          { ref: 'botTokenEnv', source: 'profile-env-field', required: true },
          { ref: 'signingSecretEnv', source: 'profile-env-field', required: true },
          { ref: 'webhookUrlEnv', source: 'profile-env-field', required: false },
        ],
      }),
      userStory: implementedChannelUserStoryTemplate({
        workflowType: 'team-thread',
        userStories: [
          'receive an allowed Slack channel or thread prompt and route it to Xenesis Agent',
          'reply in the same channel or thread after approval policy checks',
          'run a sanitized channel test before relying on remote prompts',
        ],
        prerequisiteSetup: ['gateway-running', 'slack-pairing-ready', 'slack-allowlist-configured'],
        diagnostics: ['gateway-status', 'signature-check', 'safe-to-deliver', 'allowlist-empty', 'last-error'],
      }),
    },
  },
  {
    id: 'discord',
    label: 'Discord',
    setupSteps: [
      'Create a Discord bot token or webhook URL and store it in the configured environment variable.',
      'Limit allowed channel and guild IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Discord', url: 'https://docs.openclaw.ai/channels/discord' }],
    channelTemplate: {
      category: 'community',
      adapter: 'bot-api',
      auth: 'bot token or webhook URL',
      capabilities: ['channels', 'guilds', 'files'],
      safetyControls: ['allowlist', 'guild-scope', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'discord.allowedChannelIds',
        allowlistFields: ['allowedChannelIds', 'allowedGuildIds'],
        pairing: 'Discord bot token or webhook URL',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'guild-channel',
        diagnostics: ['missing-env', 'guild-scope', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['channels', 'guilds', 'files'],
      },
      safety: {
        accessModel: 'allowlist',
        accessGroupFields: ['allowedChannelIds', 'allowedGuildIds'],
        inboundBoundary: 'discord guild and channel allowlist',
        outboundBoundary: 'same guild-channel scope as inbound route',
        loopProtection: [
          'ignore messages authored by the Discord bot account',
          'avoid channels where Xenesis can receive its own webhook output',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'guild-scope', 'allowlist-empty', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
      accessGroups: {
        model: 'profile-allowlist-fields',
        groupScope: 'guild',
        failClosed: true,
        bindings: [
          {
            groupId: 'discord-allowed-channels',
            field: 'allowedChannelIds',
            required: true,
            emptyDiagnostic: 'allowedChannelIds and allowedGuildIds are empty',
            description: 'Discord channel ids allowed to deliver prompts.',
          },
          {
            groupId: 'discord-allowed-guilds',
            field: 'allowedGuildIds',
            required: false,
            emptyDiagnostic: 'allowedChannelIds and allowedGuildIds are empty',
            description: 'Discord guild ids allowed to deliver prompts.',
          },
        ],
        diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.accessGroups.status',
          'xd.xenesis.channels.safety.status',
          'xd.xenesis.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'access-group status is read-only',
          'raw chat, channel, guild, and endpoint values are never returned',
          'empty required allowlists fail closed before delivery',
          'channel writes stay on profile update CR paths',
        ],
      },
      pairing: implementedChannelPairingTemplate({
        model: 'env-token',
        accountScope: 'bot-account',
        credentialRefs: [
          { ref: 'botTokenEnv', source: 'profile-env-field', required: true },
          { ref: 'webhookUrlEnv', source: 'profile-env-field', required: false },
        ],
      }),
      userStory: implementedChannelUserStoryTemplate({
        workflowType: 'team-thread',
        userStories: [
          'receive an allowed Discord guild-channel prompt and route it to Xenesis Agent',
          'reply in the same guild-channel scope after approval policy checks',
          'run a sanitized channel test before relying on remote prompts',
        ],
        prerequisiteSetup: ['gateway-running', 'discord-pairing-ready', 'discord-allowlist-configured'],
        diagnostics: ['gateway-status', 'guild-scope', 'safe-to-deliver', 'allowlist-empty', 'last-error'],
      }),
    },
  },
  {
    id: 'webhook',
    label: 'Webhook',
    setupSteps: [
      'Create or select the inbound webhook URL environment variable.',
      'Keep webhook auth and network exposure constrained to trusted callers.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' }],
    channelTemplate: {
      category: 'developer',
      adapter: 'webhook',
      auth: 'shared secret or protected inbound URL',
      capabilities: ['inbound-events', 'custom-routing'],
      safetyControls: ['network-boundary', 'request-auth', 'approval-guardrails'],
      routing: {
        routeBinding: 'webhook.urlEnv',
        allowlistFields: ['urlEnv'],
        pairing: 'protected inbound URL',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'request',
        diagnostics: ['missing-env', 'network-boundary', 'last-error'],
        deliveryFeatures: ['inbound-events', 'custom-routing'],
      },
      safety: {
        accessModel: 'network-boundary',
        accessGroupFields: ['urlEnv'],
        inboundBoundary: 'protected webhook URL or shared secret boundary',
        outboundBoundary: 'request-scoped response boundary',
        loopProtection: [
          'avoid endpoints that post responses back into the same inbound URL',
          'keep webhook callers scoped to trusted automation',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'network-boundary', 'request-auth', 'last-error', 'gateway-status'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
      accessGroups: {
        model: 'profile-allowlist-fields',
        groupScope: 'endpoint',
        failClosed: true,
        bindings: [
          {
            groupId: 'webhook-endpoint-env',
            field: 'urlEnv',
            required: true,
            emptyDiagnostic: 'urlEnv is empty',
            description: 'Webhook URL environment reference that defines the inbound endpoint boundary.',
          },
        ],
        diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.accessGroups.status',
          'xd.xenesis.channels.safety.status',
          'xd.xenesis.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'access-group status is read-only',
          'raw chat, channel, guild, and endpoint values are never returned',
          'empty required allowlists fail closed before delivery',
          'channel writes stay on profile update CR paths',
        ],
      },
      pairing: implementedChannelPairingTemplate({
        model: 'webhook-url',
        accountScope: 'endpoint',
        credentialRefs: [{ ref: 'urlEnv', source: 'profile-env-field', required: true }],
      }),
      userStory: implementedChannelUserStoryTemplate({
        workflowType: 'webhook-ingress',
        userStories: [
          'receive a trusted webhook event and route it to Xenesis Agent',
          'return a request-scoped response only after approval policy checks',
          'run a sanitized webhook test before relying on remote prompts',
        ],
        prerequisiteSetup: ['gateway-running', 'webhook-endpoint-ready', 'webhook-auth-boundary-configured'],
        diagnostics: ['gateway-status', 'network-boundary', 'request-auth', 'last-error'],
      }),
    },
  },
];

export const XENESIS_CONNECTION_IMPLEMENTED_MESSENGER_IDS = MESSENGERS.map((item) => item.id);

type PlannedMessengerDefinition = Omit<
  XenesisConnectionItem,
  'kind' | 'status' | 'supportLevel' | 'warnings' | 'channelTemplate'
> & {
  channelTemplate: XenesisConnectionChannelTemplate;
  warnings?: string[];
};

function messengerViewTemplate(
  id: string,
  runtimeSupport: XenesisConnectionMessengerViewTemplate['runtimeSupport'],
): XenesisConnectionMessengerViewTemplate {
  const implemented = runtimeSupport === 'implemented';
  return {
    viewType: 'messenger-detail',
    runtimeSupport,
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: implemented ? 'Settings > Xenesis Agent > External bots' : 'Settings > Xenesis Agent > Connections',
    openPath: 'xd.xenesis.messengers.views.open',
    openArgs: { id },
    connectionCardId: id,
    internalViews: implemented
      ? ['connection-card', 'channel-template', 'routing', 'external-bot-settings']
      : ['connection-card', 'channel-template', 'planning-card'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.messengers.views.status',
      ...(implemented
        ? ['xd.xenesis.channels.routing.status', 'xd.xenesis.gateway.status']
        : [
            'xd.xenesis.channels.routing.status',
            'xd.xenesis.channels.safety.status',
            'xd.xenesis.channels.accessGroups.status',
            'xd.xenesis.channels.pairing.status',
          ]),
    ],
    controlPaths: implemented
      ? [
          'xd.xenesis.messengers.views.open',
          'xd.xenesis.connections.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
        ]
      : ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
    diagnostics: implemented
      ? ['gateway-status', 'missing-env', 'allowlist', 'last-error']
      : ['planned-adapter', 'required-auth', 'safety-review'],
    safetyBoundaries: implemented
      ? [
          'implemented channels still require gateway readiness before delivery',
          'channel writes and test sends stay on existing profile CR paths',
        ]
      : [
          'planned channels open setup/readiness planning views only',
          'no gateway adapter, pairing flow, or delivery action is exposed until runtime support exists',
        ],
  };
}

const XENESIS_CHANNEL_PROFILE_DRAFT_BLOCKED_ACTIONS = [
  'mutate channel settings outside approved apply path',
  'update allowlists outside approved apply path',
  'write profile config outside approved apply path',
  'send test message',
  'start gateway',
  'store secrets',
  'bypass approvals',
];

function plannedMessenger(definition: PlannedMessengerDefinition): XenesisConnectionItem {
  const guardTemplates = plannedChannelGuardTemplates(definition.id, definition.label);
  const channelTemplate = {
    ...definition.channelTemplate,
    routing: definition.channelTemplate.routing ?? guardTemplates.routing,
    safety: definition.channelTemplate.safety ?? guardTemplates.safety,
    accessGroups: definition.channelTemplate.accessGroups ?? guardTemplates.accessGroups,
    pairing: definition.channelTemplate.pairing ?? plannedChannelPairingTemplate(definition.id),
    userStory: definition.channelTemplate.userStory ?? plannedChannelUserStoryTemplate(definition.id, definition.label),
  };

  return {
    ...definition,
    channelTemplate,
    kind: 'messenger',
    status: 'planned',
    supportLevel: 'planned',
    messengerView: messengerViewTemplate(definition.id, 'planned'),
    channelProfileDraft: buildXenesisPlannedChannelProfileDraft({
      channel: definition.id,
      label: definition.label,
      channelTemplate,
      warnings: definition.warnings,
    }),
    crActions: [],
    warnings: definition.warnings ?? [`No ${definition.label} gateway adapter is bundled yet.`],
  };
}

function openClawDoc(label: string, slug: string): XenesisConnectionSourceDoc {
  return { label: `OpenClaw ${label}`, url: `https://docs.openclaw.ai/channels/${slug}` };
}

const PLANNED_MESSENGERS: XenesisConnectionItem[] = [
  plannedMessenger({
    id: 'whatsapp',
    label: 'WhatsApp',
    summary: 'Planned mobile messenger channel; keep manual until provider, webhook, and delivery safety are verified.',
    setupSteps: [
      'Select a verified WhatsApp Business or OpenClaw-compatible provider adapter.',
      'Document allowed sender IDs before remote prompts are accepted.',
      'Verify delivery and bot-loop behavior before enabling action workflows.',
    ],
    sourceDocs: [openClawDoc('WhatsApp', 'whatsapp')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'provider-webhook',
      auth: 'business provider token and webhook signature',
      capabilities: ['direct-messages', 'media'],
      safetyControls: ['sender-allowlist', 'webhook-signature', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'signal',
    label: 'Signal',
    summary: 'Planned privacy messenger channel after a verified bridge and account pairing flow are selected.',
    setupSteps: [
      'Select and document the Signal bridge or pairing runtime.',
      'Require explicit account pairing and sender allowlists before accepting prompts.',
      'Verify bridge reconnect behavior before enabling long-running sessions.',
    ],
    sourceDocs: [openClawDoc('Signal', 'signal')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'bridge',
      auth: 'paired device or bridge account',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['sender-allowlist', 'pairing-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    summary:
      'Planned enterprise messenger channel; keep manual until adapter, auth, and allowed-team controls are verified.',
    setupSteps: [
      'Define the Teams app/bot registration path and tenant restrictions.',
      'Verify allowed-team and allowed-channel controls before enabling remote prompts.',
      'Confirm Graph or Bot Framework scopes before adding write actions.',
    ],
    sourceDocs: [openClawDoc('Microsoft Teams', 'msteams')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-framework',
      auth: 'tenant app registration and bot secret',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['tenant-scope', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'google-chat',
    label: 'Google Chat',
    summary:
      'Planned external messenger channel after a verified gateway adapter and OAuth/service-account setup are selected.',
    setupSteps: [
      'Select a verified Google Chat app or webhook adapter before exposing runtime enablement.',
      'Document workspace installation, allowed spaces, and bot loop protection before activation.',
      'Keep service-account or OAuth scopes visible in the setup view.',
    ],
    sourceDocs: [
      openClawDoc('Google Chat', 'googlechat'),
      {
        label: 'Hermes Google Chat messaging',
        url: 'https://hermes-agent.nousresearch.com/docs/user-guide/messaging/google_chat',
      },
    ],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'workspace-app',
      auth: 'workspace app, service account, or OAuth',
      capabilities: ['spaces', 'threads', 'cards'],
      safetyControls: ['workspace-scope', 'space-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'imessage',
    label: 'iMessage',
    summary:
      'Planned Apple Messages channel; keep manual until host pairing, routing, and privacy controls are verified.',
    setupSteps: [
      'Choose native iMessage or BlueBubbles bridge architecture.',
      'Document host, account, and recipient allowlist requirements.',
      'Verify local-host privacy and reconnect behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('iMessage', 'imessage'), openClawDoc('BlueBubbles iMessage', 'imessage-from-bluebubbles')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'desktop-bridge',
      auth: 'paired Apple account or BlueBubbles server credentials',
      capabilities: ['direct-messages', 'attachments'],
      safetyControls: ['recipient-allowlist', 'host-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'matrix',
    label: 'Matrix',
    summary: 'Planned federated chat channel after homeserver, room, and push-rule behavior are verified.',
    setupSteps: [
      'Configure the Matrix homeserver and bot account.',
      'Restrict allowed rooms before enabling delivery.',
      'Review push rules and migration behavior before long-running sessions.',
    ],
    sourceDocs: [
      openClawDoc('Matrix', 'matrix'),
      openClawDoc('Matrix migration', 'matrix-migration'),
      openClawDoc('Matrix push rules', 'matrix-push-rules'),
    ],
    channelTemplate: {
      category: 'community',
      adapter: 'bot-api',
      auth: 'homeserver access token',
      capabilities: ['rooms', 'threads', 'files'],
      safetyControls: ['room-allowlist', 'homeserver-scope', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'irc',
    label: 'IRC',
    summary: 'Planned legacy chat channel after server, channel, and nickname controls are defined.',
    setupSteps: [
      'Define IRC server, TLS, nickname, and channel configuration.',
      'Limit allowed channels before accepting prompts.',
      'Keep command parsing conservative because IRC messages are plain text.',
    ],
    sourceDocs: [openClawDoc('IRC', 'irc')],
    channelTemplate: {
      category: 'community',
      adapter: 'socket-bot',
      auth: 'server password, NickServ, or none',
      capabilities: ['channels', 'plain-text'],
      safetyControls: ['channel-allowlist', 'command-prefix', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'mattermost',
    label: 'Mattermost',
    summary: 'Planned self-hosted enterprise channel after server and team scopes are verified.',
    setupSteps: [
      'Configure the Mattermost server URL and bot token.',
      'Restrict allowed teams and channels before enabling prompts.',
      'Verify attachment and thread behavior before write workflows.',
    ],
    sourceDocs: [openClawDoc('Mattermost', 'mattermost')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-api',
      auth: 'server URL and bot token',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['team-allowlist', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'nextcloud-talk',
    label: 'Nextcloud Talk',
    summary: 'Planned collaboration channel after Nextcloud server, room, and credential handling are verified.',
    setupSteps: [
      'Configure the Nextcloud base URL and app password or token.',
      'Restrict allowed conversations before accepting prompts.',
      'Verify file sharing behavior before enabling write workflows.',
    ],
    sourceDocs: [openClawDoc('Nextcloud Talk', 'nextcloud-talk')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'server-api',
      auth: 'Nextcloud app password or token',
      capabilities: ['rooms', 'files'],
      safetyControls: ['room-allowlist', 'server-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'nostr',
    label: 'Nostr',
    summary: 'Planned decentralized channel after relay, key, and identity controls are defined.',
    setupSteps: [
      'Define relay list and bot identity storage.',
      'Restrict accepted authors or event kinds before accepting prompts.',
      'Avoid exposing private keys in Desk settings.',
    ],
    sourceDocs: [openClawDoc('Nostr', 'nostr')],
    channelTemplate: {
      category: 'community',
      adapter: 'relay-client',
      auth: 'Nostr key material or signer',
      capabilities: ['relays', 'events'],
      safetyControls: ['author-allowlist', 'key-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'raft',
    label: 'Raft',
    summary: 'Planned OpenClaw Raft channel until adapter semantics and routing controls are mapped into Xenesis.',
    setupSteps: [
      'Map the Raft channel adapter requirements into Xenesis gateway config.',
      'Document route IDs and allowed peers before accepting prompts.',
      'Verify loop protection before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Raft', 'raft')],
    channelTemplate: {
      category: 'developer',
      adapter: 'openclaw-adapter',
      auth: 'adapter-specific credentials',
      capabilities: ['custom-routing'],
      safetyControls: ['peer-allowlist', 'route-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'tlon',
    label: 'Tlon',
    summary: 'Planned Tlon channel until identity, group, and routing behavior are verified.',
    setupSteps: [
      'Document Tlon identity and group requirements.',
      'Restrict allowed groups before accepting prompts.',
      'Verify inbound/outbound loop behavior.',
    ],
    sourceDocs: [openClawDoc('Tlon', 'tlon')],
    channelTemplate: {
      category: 'community',
      adapter: 'platform-api',
      auth: 'platform identity credentials',
      capabilities: ['groups', 'direct-messages'],
      safetyControls: ['group-allowlist', 'identity-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'synology-chat',
    label: 'Synology Chat',
    summary: 'Planned self-hosted chat channel after webhook/token behavior is verified.',
    setupSteps: [
      'Configure the Synology Chat server and integration token.',
      'Restrict allowed channels before accepting prompts.',
      'Verify server trust and outbound delivery behavior.',
    ],
    sourceDocs: [openClawDoc('Synology Chat', 'synology-chat')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'server-webhook',
      auth: 'server token or webhook secret',
      capabilities: ['channels', 'webhooks'],
      safetyControls: ['server-boundary', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'rocket-chat',
    label: 'Rocket.Chat',
    summary: 'Planned self-hosted enterprise chat channel after server, bot user, and room controls are verified.',
    setupSteps: [
      'Configure the Rocket.Chat server URL and bot user credentials.',
      'Restrict allowed rooms and teams before accepting prompts.',
      'Verify thread, attachment, and bot-loop behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Rocket.Chat', 'rocket-chat')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-api',
      auth: 'server URL and bot user token',
      capabilities: ['rooms', 'threads', 'files'],
      safetyControls: ['room-allowlist', 'server-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'twitch',
    label: 'Twitch',
    summary: 'Planned livestream chat channel after broadcaster, moderator, and chat-rate controls are verified.',
    setupSteps: [
      'Configure Twitch app credentials or bot OAuth.',
      'Restrict allowed channels and broadcaster IDs.',
      'Apply conservative rate limits before enabling replies.',
    ],
    sourceDocs: [openClawDoc('Twitch', 'twitch')],
    channelTemplate: {
      category: 'community',
      adapter: 'chat-api',
      auth: 'OAuth token',
      capabilities: ['channels', 'chat'],
      safetyControls: ['channel-allowlist', 'rate-limit', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'line',
    label: 'LINE',
    summary: 'Planned regional messenger channel after LINE bot credentials and allowed rooms are verified.',
    setupSteps: [
      'Configure LINE channel secret and access token.',
      'Restrict allowed user, group, or room IDs before accepting prompts.',
      'Verify webhook signature behavior before delivery.',
    ],
    sourceDocs: [openClawDoc('LINE', 'line')],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-api',
      auth: 'channel secret and access token',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['signature-verification', 'room-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'wechat',
    label: 'WeChat',
    summary: 'Planned regional messenger channel after official account or bot adapter setup is verified.',
    setupSteps: [
      'Choose the WeChat official account or bot adapter path.',
      'Document account verification, callback, and allowed sender requirements.',
      'Verify delivery constraints before write workflows.',
    ],
    sourceDocs: [openClawDoc('WeChat', 'wechat')],
    channelTemplate: {
      category: 'regional',
      adapter: 'official-account',
      auth: 'official account token and callback secret',
      capabilities: ['direct-messages', 'media'],
      safetyControls: ['sender-allowlist', 'callback-verification', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'qqbot',
    label: 'QQ Bot',
    summary: 'Planned regional bot channel after QQ bot app credentials and group controls are verified.',
    setupSteps: [
      'Configure QQ Bot app credentials and callback endpoint.',
      'Restrict allowed groups before accepting prompts.',
      'Verify callback signatures before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('QQ Bot', 'qqbot')],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-api',
      auth: 'app credentials and callback signature',
      capabilities: ['groups', 'direct-messages'],
      safetyControls: ['group-allowlist', 'signature-verification', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'feishu',
    label: 'Feishu / Lark',
    summary: 'Planned enterprise messenger channel after tenant app credentials and chat scopes are verified.',
    setupSteps: [
      'Configure Feishu/Lark app ID, secret, and event subscription.',
      'Restrict allowed chats or tenant before accepting prompts.',
      'Verify event signature behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Feishu', 'feishu')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'tenant-app',
      auth: 'app ID, app secret, and event verification token',
      capabilities: ['chats', 'threads', 'cards'],
      safetyControls: ['tenant-scope', 'chat-allowlist', 'signature-verification', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'dingding',
    label: 'DingTalk / Dingding',
    summary:
      'Planned enterprise messenger channel after tenant robot credentials and conversation scopes are verified.',
    setupSteps: [
      'Configure DingTalk robot or tenant app credentials and callback verification.',
      'Restrict allowed groups or conversations before accepting prompts.',
      'Verify signature, tenant, and outbound delivery behavior before enabling replies.',
    ],
    sourceDocs: [openClawDoc('DingTalk / Dingding', 'dingding')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'tenant-app',
      auth: 'robot token, app secret, and event verification signature',
      capabilities: ['groups', 'threads', 'cards'],
      safetyControls: ['tenant-scope', 'conversation-allowlist', 'signature-verification', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'yuanbao',
    label: 'Yuanbao',
    summary: 'Planned regional assistant channel until adapter and account controls are mapped into Xenesis.',
    setupSteps: [
      'Document Yuanbao adapter credentials and supported message events.',
      'Restrict allowed accounts or rooms before accepting prompts.',
      'Verify human/bot loop behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Yuanbao', 'yuanbao')],
    channelTemplate: {
      category: 'regional',
      adapter: 'platform-adapter',
      auth: 'platform-specific credentials',
      capabilities: ['direct-messages'],
      safetyControls: ['account-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'zalo',
    label: 'Zalo',
    summary: 'Planned regional messenger channel after Zalo bot/user adapter and delivery controls are verified.',
    setupSteps: [
      'Choose the Zalo bot or user adapter path.',
      'Restrict allowed users or groups before accepting prompts.',
      'Verify callback auth and rate limits before enabling replies.',
    ],
    sourceDocs: [
      openClawDoc('Zalo', 'zalo'),
      openClawDoc('Zalo Bot', 'zaloclawbot'),
      openClawDoc('Zalo User', 'zalouser'),
    ],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-or-user-adapter',
      auth: 'adapter-specific token or session',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['sender-allowlist', 'rate-limit', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'email',
    label: 'Email',
    summary: 'Planned asynchronous inbox channel after mailbox, sender, and thread controls are verified.',
    setupSteps: [
      'Select IMAP/SMTP, Gmail, or workspace mailbox adapter.',
      'Restrict accepted sender addresses and target folders before accepting prompts.',
      'Keep attachments and outbound replies approval-gated.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'mailbox',
      auth: 'OAuth or app password',
      capabilities: ['threads', 'attachments', 'asynchronous'],
      safetyControls: ['sender-allowlist', 'folder-scope', 'attachment-review', 'approval-guardrails'],
    },
    warnings: ['No Email gateway adapter is bundled yet.'],
  }),
  plannedMessenger({
    id: 'sms',
    label: 'SMS',
    summary: 'Planned SMS channel after provider, sender number, and recipient controls are verified.',
    setupSteps: [
      'Select the SMS provider and sender number.',
      'Restrict allowed phone numbers before accepting prompts.',
      'Keep outbound messages short and approval-gated.',
    ],
    sourceDocs: [openClawDoc('SMS', 'sms')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'provider-webhook',
      auth: 'provider API key and webhook signature',
      capabilities: ['direct-messages', 'asynchronous'],
      safetyControls: ['phone-allowlist', 'webhook-signature', 'rate-limit', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'home-assistant',
    label: 'Home Assistant',
    summary: 'Planned automation channel after local network, entity, and action safety boundaries are defined.',
    setupSteps: [
      'Configure Home Assistant URL and long-lived token.',
      'Restrict allowed entities and service calls before enabling prompts.',
      'Route mutating home actions through explicit approval.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    channelTemplate: {
      category: 'iot',
      adapter: 'local-api',
      auth: 'long-lived access token',
      capabilities: ['events', 'entity-state', 'automation'],
      safetyControls: ['entity-allowlist', 'network-boundary', 'approval-guardrails'],
    },
    warnings: ['No Home Assistant gateway adapter is bundled yet.'],
  }),
  plannedMessenger({
    id: 'ntfy',
    label: 'ntfy',
    summary: 'Planned push-notification channel after topic, token, and delivery controls are verified.',
    setupSteps: [
      'Configure ntfy server, topic, and token if required.',
      'Restrict allowed topics before accepting prompts.',
      'Keep one-way notifications separate from interactive sessions until reply behavior exists.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    channelTemplate: {
      category: 'developer',
      adapter: 'push-topic',
      auth: 'topic token or none',
      capabilities: ['notifications'],
      safetyControls: ['topic-allowlist', 'network-boundary', 'approval-guardrails'],
    },
    warnings: ['No ntfy gateway adapter is bundled yet.'],
  }),
];

export const XENESIS_CONNECTION_MESSENGER_IDS = [
  ...XENESIS_CONNECTION_IMPLEMENTED_MESSENGER_IDS,
  ...PLANNED_MESSENGERS.map((item) => item.id),
];

type XenesisConnectionProviderId = (typeof XENESIS_CONNECTION_PROVIDER_IDS)[number];

const XENESIS_CONNECTION_NATURAL_PROVIDER_TARGET_IDS: readonly XenesisConnectionProviderId[] = [
  'codex-app-server',
  'codex-cli',
  'claude-cli',
  'claude-interactive',
  'azure',
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek',
  'qwen',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
  'auto',
];

const XENESIS_CONNECTION_NATURAL_PROVIDER_ALIAS_WORDS: Record<XenesisConnectionProviderId, readonly string[]> = {
  anthropic: ['anthropic', 'anthropic claude', '앤트로픽'],
  auto: ['auto', '자동'],
  azure: ['azure openai', 'azure-openai', 'azure', '애저 오픈ai', '애저 오픈 ai'],
  'claude-cli': ['claude cli', 'claude-cli'],
  'claude-interactive': ['claude interactive', 'claude-interactive', '클로드 interactive', '클로드 인터랙티브'],
  'codex-app-server': ['codex app-server', 'codex-app-server', 'codex app server', 'app-server', 'app server'],
  'codex-cli': ['codex cli', 'codex-cli'],
  deepseek: ['deepseek', 'deep seek', '딥시크'],
  fireworks: ['fireworks ai', 'fireworks', '파이어웍스'],
  gemini: ['gemini', '제미나이'],
  groq: ['groq', '그록'],
  lmstudio: ['lm studio', 'lmstudio', 'lm-studio', '엘엠 스튜디오'],
  ollama: ['ollama', '올라마'],
  openai: ['openai', '오픈ai', '오픈 ai'],
  qwen: ['qwen', 'dashscope', 'dash scope', '큐원', '큐웬'],
  together: ['together ai', 'together', '투게더'],
};

const XENESIS_CONNECTION_NATURAL_TOOL_ALIAS_WORDS: Record<string, readonly string[]> = {
  fetch: [
    'fetch',
    '웹 fetch',
    '웹 가져오기',
    'web page fetch',
    'webpage fetch',
    '웹페이지 가져오기',
    '웹 페이지 가져오기',
  ],
  filesystem: ['filesystem', 'file system', '파일시스템', '파일 시스템', 'workspace files', '워크스페이스 파일'],
  github: ['github', '깃허브'],
  'google-calendar': ['google calendar', '구글 캘린더', '캘린더'],
  'google-workspace': [
    'google workspace',
    '구글 워크스페이스',
    'gmail',
    '지메일',
    'google docs',
    'google drive',
    '구글 문서',
    '구글 독스',
    '구글 드라이브',
    'workspace',
    '워크스페이스',
  ],
  linear: ['linear', '리니어'],
  notion: ['notion', '노션'],
};

const XENESIS_CONNECTION_NATURAL_MESSENGER_ALIAS_WORDS: Record<string, readonly string[]> = {
  dingding: ['dingtalk', 'ding talk', 'dingding', '딩톡', '딩딩'],
  discord: ['discord', '디스코드'],
  email: ['email', '이메일', 'mailbox', '메일박스', '메일'],
  feishu: ['feishu', 'lark', '페이슈', '페이수', '라크'],
  'google-chat': ['google chat', 'google-chat', '구글 챗', '구글 채팅'],
  'home-assistant': ['home assistant', 'home-assistant', '홈 어시스턴트', '홈어시스턴트'],
  imessage: ['imessage', '아이메시지', '아이메세지', 'bluebubbles', '블루버블'],
  irc: ['irc', '아이알씨'],
  line: ['line', '라인'],
  mattermost: ['mattermost', '매터모스트'],
  matrix: ['matrix', '매트릭스'],
  'microsoft-teams': ['microsoft teams', 'microsoft-teams', 'ms teams', 'teams', '팀즈', '마이크로소프트 팀즈'],
  'nextcloud-talk': ['nextcloud talk', 'nextcloud-talk', '넥스트클라우드 톡', '넥스트클라우드 토크'],
  nostr: ['nostr', '노스트르'],
  ntfy: ['ntfy', '엔티파이'],
  qqbot: ['qqbot', 'qq bot', 'qq 봇', '큐큐봇'],
  raft: ['raft', '래프트'],
  'rocket-chat': ['rocket chat', 'rocket-chat', 'rocketchat', '로켓챗', '로켓 채팅'],
  signal: ['signal', '시그널'],
  slack: ['slack', '슬랙'],
  sms: ['sms', '문자 메시지', '문자메시지', '문자'],
  'synology-chat': ['synology chat', 'synology-chat', '시놀로지 챗', '시놀로지 채팅'],
  telegram: ['telegram', '텔레그램'],
  tlon: ['tlon', '틀론'],
  twitch: ['twitch', '트위치'],
  webhook: ['webhook', '웹훅'],
  wechat: ['wechat', 'weixin', '위챗', '웨이신'],
  whatsapp: ['whatsapp', '왓츠앱', '와츠앱'],
  yuanbao: ['yuanbao', '위안바오'],
  zalo: ['zalo', '잘로'],
};

function naturalConnectionTargetFromItem(
  item: Pick<XenesisConnectionItem, 'id' | 'label' | 'supportLevel'> & { status?: XenesisConnectionStatus },
  kind: XenesisConnectionNaturalConnectionTarget['kind'],
  words: readonly string[],
): XenesisConnectionNaturalConnectionTarget {
  const supportLevel =
    item.supportLevel ?? (kind === 'messenger' ? (item.status === 'planned' ? 'planned' : 'implemented') : undefined);

  return {
    id: item.id,
    label: item.label,
    kind,
    supportLevel,
    words: uniqueStrings(words),
  };
}

export const XENESIS_CONNECTION_NATURAL_CONNECTION_TARGETS: readonly XenesisConnectionNaturalConnectionTarget[] = [
  ...TOOL_CONNECTIONS.map((item) =>
    naturalConnectionTargetFromItem(item, 'tool', XENESIS_CONNECTION_NATURAL_TOOL_ALIAS_WORDS[item.id] ?? [item.id]),
  ),
  ...[...MESSENGERS, ...PLANNED_MESSENGERS].map((item) =>
    naturalConnectionTargetFromItem(
      item,
      'messenger',
      XENESIS_CONNECTION_NATURAL_MESSENGER_ALIAS_WORDS[item.id] ?? [item.id],
    ),
  ),
];

export const XENESIS_CONNECTION_NATURAL_PROVIDER_TARGETS: readonly XenesisConnectionNaturalWordsTarget[] =
  XENESIS_CONNECTION_NATURAL_PROVIDER_TARGET_IDS.map((id) => ({
    id,
    label: id,
    words: uniqueStrings(XENESIS_CONNECTION_NATURAL_PROVIDER_ALIAS_WORDS[id] ?? [id]),
  }));

export const XENESIS_CONNECTION_NATURAL_PLANNED_GOOGLE_TOOL_IDS = XENESIS_CONNECTION_TOOL_OAUTH_DRAFT_IDS;

export function isXenesisConnectionNaturalPlannedGoogleToolTarget(
  target: Pick<XenesisConnectionNaturalConnectionTarget, 'id' | 'kind'>,
): boolean {
  return (
    target.kind === 'tool' &&
    (XENESIS_CONNECTION_NATURAL_PLANNED_GOOGLE_TOOL_IDS as readonly string[]).includes(target.id)
  );
}

const XENESIS_CONNECTION_NATURAL_GUIDE_TARGET_CONFIG: readonly Omit<XenesisConnectionNaturalGuideTarget, 'label'>[] = [
  {
    id: 'agent-user-stories',
    words: [
      'user story',
      'user stories',
      'task story',
      'task stories',
      'task scenario',
      'task scenarios',
      '사용자 스토리',
      '작업 스토리',
      '작업 시나리오',
      '시나리오',
      '스토리',
      'hermes story',
      'hermes scenario',
      '헤르메스 스토리',
      '헤르메스 시나리오',
    ],
    requiredWordGroups: [['hermes', '헤르메스']],
    blockedByMatchedTargetIds: ['external-tool-integrations', 'openclaw-channel-setup'],
  },
  {
    id: 'external-tool-integrations',
    words: [
      'external tool',
      'external tools',
      'tool integration',
      'tool integrations',
      'mcp tool',
      'mcp tools',
      'hermes integration',
      'hermes integrations',
      '헤르메스 통합',
      '외부 도구',
      '도구 통합',
      'oauth',
      'connector',
      '커넥터',
      'google workspace',
      'google drive',
      'google docs',
      'google calendar',
      '구글 워크스페이스',
      '구글 드라이브',
      '구글 독스',
      '구글 캘린더',
      'notion',
      '노션',
      'linear',
      '리니어',
      'fetch',
      'filesystem',
      '파일 시스템',
      '파일시스템',
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      [
        'tool',
        'tools',
        '도구',
        'mcp',
        'oauth',
        'google',
        '구글',
        'notion',
        '노션',
        'linear',
        '리니어',
        'hermes',
        '헤르메스',
      ],
    ],
  },
  {
    id: 'openclaw-channel-setup',
    words: [
      'openclaw',
      '오픈클로',
      '오픈클로우',
      'channel',
      'channels',
      '채널',
      'messenger',
      'messengers',
      '메신저',
      'access group',
      'access groups',
      '액세스 그룹',
      '접근 그룹',
      'routing',
      '라우팅',
      'pairing',
      '페어링',
      'troubleshooting',
      'troubleshoot',
      '문제 해결',
      'telegram',
      '텔레그램',
      'slack',
      '슬랙',
      'discord',
      '디스코드',
      'whatsapp',
      '왓츠앱',
      'google chat',
      '구글 챗',
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      ['channel', 'channels', '채널', 'messenger', 'messengers', '메신저'],
    ],
  },
  {
    id: 'cr-mcp-gateway-bots',
    words: ['cr', 'mcp', 'gateway', '게이트웨이', 'bot', '봇'],
  },
  {
    id: 'onboarding-connections',
    words: [],
    fallback: true,
  },
];

function xenesisConnectionGuideLabel(id: string): string {
  return XENESIS_CONNECTION_GUIDES.find((item) => item.id === id)?.label ?? id;
}

export const XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS: readonly XenesisConnectionNaturalGuideTarget[] =
  XENESIS_CONNECTION_NATURAL_GUIDE_TARGET_CONFIG.map((target) => ({
    ...target,
    label: xenesisConnectionGuideLabel(target.id),
    words: uniqueStrings(target.words),
  }));

const XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGET_METADATA: Record<
  (typeof XENESIS_CONNECTION_ONBOARDING_STEP_IDS)[number],
  Omit<XenesisConnectionNaturalWordsTarget, 'id'>
> = {
  'first-chat': {
    label: 'First chat',
    words: ['first chat', '첫 채팅', '첫채팅', '첫 응답', 'first response'],
  },
  'local-cli-mcp': {
    label: 'Local CLI and MCP',
    words: ['local cli', '로컬 cli', 'local-cli', 'mcp', 'mcp bridge', 'mcp 브리지', '로컬 런타임'],
  },
  'recommended-tools': {
    label: 'Recommended tools',
    words: ['recommended tools', '추천 도구', '외부 도구', 'external tools', 'tool onboarding', '도구 온보딩'],
  },
  gateway: {
    label: 'Gateway',
    words: ['gateway', '게이트웨이'],
  },
  'messenger-routing': {
    label: 'Messenger routing',
    words: ['messenger routing', '메신저 라우팅', 'channel routing', '채널 라우팅', 'external bots', '외부 봇'],
  },
  'test-send': {
    label: 'End-to-end test',
    words: ['end-to-end', 'e2e', '엔드투엔드', 'test send', '테스트 전송', '최종 테스트'],
  },
};

export const XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS: readonly XenesisConnectionNaturalWordsTarget[] =
  XENESIS_CONNECTION_ONBOARDING_STEP_IDS.map((id) => ({
    id,
    label: XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGET_METADATA[id].label,
    words: uniqueStrings(XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGET_METADATA[id].words),
  }));

function countItems(sections: XenesisConnectionsStatus['sections']): XenesisConnectionsStatus['summary'] {
  const summary = {
    ready: 0,
    'needs-setup': 0,
    disabled: 0,
    blocked: 0,
    planned: 0,
    unknown: 0,
    total: 0,
  };
  for (const section of Object.values(sections)) {
    for (const item of section.items) {
      summary[item.status] += 1;
      summary.total += 1;
    }
  }
  return summary;
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

const XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS = [
  'does not install MCP servers',
  'does not complete OAuth',
  'does not store tokens',
  'does not execute provider tools',
  'does not mutate provider/tool/channel settings without setup apply approval',
  'does not send messages',
];

const XENESIS_MCP_INSTALL_DRAFT_BLOCKED_ACTIONS = [
  'install MCP server',
  'write MCP config',
  'run shell command',
  'complete OAuth',
  'store tokens',
  'execute provider tools',
  'mutate settings',
];

const XENESIS_TOOL_OAUTH_DRAFT_BLOCKED_ACTIONS = [
  'complete OAuth',
  'store tokens',
  'write MCP config',
  'execute provider tools',
  'mutate settings',
];

function missingEnvFor(requiredEnv: readonly string[], env: Record<string, string | undefined>): string[] {
  return uniqueStrings(requiredEnv.filter((ref) => !env[ref]?.trim()));
}

interface XenesisConnectionChannelProfileDraftFieldDefinition {
  field: string;
  label: string;
  required: boolean;
  secretRef: boolean;
  description: string;
}

const XENESIS_CHANNEL_PROFILE_DRAFT_FIELDS: Record<
  XenesisProfileChannelName,
  XenesisConnectionChannelProfileDraftFieldDefinition[]
> = {
  telegram: [
    {
      field: 'enabled',
      label: 'Enabled',
      required: false,
      secretRef: false,
      description: 'Whether Telegram delivery is enabled in the active Xenesis profile.',
    },
    {
      field: 'tokenEnv',
      label: 'Token env',
      required: true,
      secretRef: true,
      description: 'Environment variable reference for the Telegram bot token.',
    },
    {
      field: 'allowedChatIds',
      label: 'Allowed chat ids',
      required: true,
      secretRef: false,
      description: 'Allowed Telegram chat ids for inbound prompts and replies.',
    },
  ],
  slack: [
    {
      field: 'enabled',
      label: 'Enabled',
      required: false,
      secretRef: false,
      description: 'Whether Slack delivery is enabled in the active Xenesis profile.',
    },
    {
      field: 'botTokenEnv',
      label: 'Bot token env',
      required: true,
      secretRef: true,
      description: 'Environment variable reference for the Slack bot token.',
    },
    {
      field: 'signingSecretEnv',
      label: 'Signing secret env',
      required: true,
      secretRef: true,
      description: 'Environment variable reference for Slack request signature verification.',
    },
    {
      field: 'webhookUrlEnv',
      label: 'Webhook URL env',
      required: false,
      secretRef: true,
      description: 'Optional environment variable reference for Slack webhook delivery.',
    },
    {
      field: 'allowedChannelIds',
      label: 'Allowed channel ids',
      required: true,
      secretRef: false,
      description: 'Allowed Slack channel ids for inbound prompts and replies.',
    },
  ],
  discord: [
    {
      field: 'enabled',
      label: 'Enabled',
      required: false,
      secretRef: false,
      description: 'Whether Discord delivery is enabled in the active Xenesis profile.',
    },
    {
      field: 'botTokenEnv',
      label: 'Bot token env',
      required: true,
      secretRef: true,
      description: 'Environment variable reference for the Discord bot token.',
    },
    {
      field: 'webhookUrlEnv',
      label: 'Webhook URL env',
      required: false,
      secretRef: true,
      description: 'Optional environment variable reference for Discord webhook delivery.',
    },
    {
      field: 'allowedChannelIds',
      label: 'Allowed channel ids',
      required: true,
      secretRef: false,
      description: 'Allowed Discord channel ids for inbound prompts and replies.',
    },
    {
      field: 'allowedGuildIds',
      label: 'Allowed guild ids',
      required: true,
      secretRef: false,
      description: 'Allowed Discord guild ids that constrain channel delivery.',
    },
  ],
  webhook: [
    {
      field: 'enabled',
      label: 'Enabled',
      required: false,
      secretRef: false,
      description: 'Whether webhook ingress is enabled in the active Xenesis profile.',
    },
    {
      field: 'urlEnv',
      label: 'URL env',
      required: true,
      secretRef: true,
      description: 'Environment variable reference for the protected webhook URL.',
    },
  ],
};

function channelProfileDraftApprovalMode(
  value: unknown,
): XenesisConnectionChannelProfileDraftGuardrails['approvalMode'] {
  if (value === 'readonly' || value === 'safe' || value === 'auto') return value;
  return 'safe';
}

function channelProfileDraftPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  return fallback;
}

function channelProfileDraftFieldState(
  field: XenesisConnectionChannelProfileDraftFieldDefinition,
  settings: Record<string, unknown> | undefined,
  env: Record<string, string | undefined>,
): XenesisConnectionChannelProfileDraftFieldValueState {
  const value = settings?.[field.field];
  if (typeof value === 'boolean') return 'configured';
  if (Array.isArray(value)) return value.length > 0 ? 'configured' : field.required ? 'empty' : 'not-required';
  if (typeof value !== 'string') return field.required ? 'unknown' : 'not-required';

  const ref = value.trim();
  if (!ref) return field.required ? 'empty' : 'not-required';
  if (field.secretRef) return env[ref]?.trim() ? 'configured' : 'missing-env';
  return 'configured';
}

function channelProfileDraftMissingFieldKey(
  field: XenesisConnectionChannelProfileDraftFieldDefinition,
  valueState: XenesisConnectionChannelProfileDraftFieldValueState,
): string | undefined {
  if (!field.required || valueState === 'configured') return undefined;
  if (!field.secretRef) return field.field;
  return valueState === 'empty' ? `${field.field}:env-ref` : `${field.field}:env-secret`;
}

function channelProfileDraftReviewStep(
  input: XenesisConnectionChannelProfileDraftReviewStep,
): XenesisConnectionChannelProfileDraftReviewStep {
  return {
    ...input,
    requiredFields: uniqueStrings(input.requiredFields),
    readPaths: uniqueStrings(input.readPaths),
    controlPaths: uniqueStrings(input.controlPaths),
    diagnostics: uniqueStrings(input.diagnostics),
  };
}

function channelProfileFieldDiagnostics(
  fields: XenesisConnectionChannelProfileDraftField[],
  missingRequiredFields: string[],
): string[] {
  const fieldNames = new Set(fields.map((field) => field.field));
  return uniqueStrings([
    ...fields.map((field) => `${field.field}:${field.valueState}`),
    ...missingRequiredFields.filter((field) => fieldNames.has(field.split(':')[0] ?? field)),
  ]);
}

function channelProfileDraftReviewSteps(input: {
  channel: string;
  label: string;
  profileFields: XenesisConnectionChannelProfileDraftField[];
  missingRequiredFields: string[];
  guardrails: XenesisConnectionChannelProfileDraftGuardrails;
  channelTemplate?: XenesisConnectionChannelTemplate;
  planned: boolean;
}): XenesisConnectionChannelProfileDraftReviewStep[] {
  const credentialFields = input.profileFields.filter(
    (field) => field.secretRef || (input.planned && ['adapter', 'auth'].includes(field.field)),
  );
  const accessFields = input.profileFields.filter(
    (field) => field.field.startsWith('allowed') || field.field === 'routeScope',
  );
  return [
    channelProfileDraftReviewStep({
      id: 'channel-credential-readiness',
      label: 'Review channel credential readiness',
      phase: 'channel-credential-readiness',
      expectedState: `${input.label} credential, adapter, or auth readiness is visible without returning secrets.`,
      requiredFields: credentialFields.filter((field) => field.required).map((field) => field.field),
      readPaths: [
        'xd.xenesis.channels.profileDrafts.status',
        'xd.xenesis.channels.pairing.status',
        'xd.xenesis.messengers.views.status',
      ],
      controlPaths: [
        'xd.xenesis.channels.profileDrafts.open',
        'xd.xenesis.channels.profileDrafts.request',
        'xd.xenesis.messengers.views.open',
      ],
      diagnostics: [
        'channel-credential-readiness',
        ...channelProfileFieldDiagnostics(credentialFields, input.missingRequiredFields),
        ...(input.channelTemplate?.pairing?.diagnostics ?? []),
      ],
      safetyBoundary: 'Channel credential review does not return secrets, write profile config, or start adapters.',
    }),
    channelProfileDraftReviewStep({
      id: 'access-allowlist-review',
      label: 'Review access allowlist',
      phase: 'access-allowlist-review',
      expectedState: `${input.label} access or route-scope bindings are visible before delivery is enabled.`,
      requiredFields: accessFields.filter((field) => field.required).map((field) => field.field),
      readPaths: [
        'xd.xenesis.channels.profileDrafts.status',
        'xd.xenesis.channels.accessGroups.status',
        'xd.xenesis.channels.safety.status',
        'xd.xenesis.channels.routing.status',
      ],
      controlPaths: [
        'xd.xenesis.channels.profileDrafts.open',
        'xd.xenesis.channels.profileDrafts.request',
        'xd.xenesis.messengers.views.open',
      ],
      diagnostics: [
        'access-allowlist-review',
        ...channelProfileFieldDiagnostics(accessFields, input.missingRequiredFields),
        ...(input.channelTemplate?.accessGroups?.diagnostics ?? []),
      ],
      safetyBoundary: 'Access review does not update allowlists, route bindings, or channel settings.',
    }),
    channelProfileDraftReviewStep({
      id: 'delivery-guardrails',
      label: 'Review delivery guardrails',
      phase: 'delivery-guardrails',
      expectedState: `${input.label} approval mode, turn limit, and token limit are visible before remote delivery.`,
      requiredFields: ['approvalMode', 'maxTurns', 'maxTokens'],
      readPaths: [
        'xd.xenesis.channels.profileDrafts.status',
        'xd.xenesis.channels.safety.status',
        'xd.xenesis.connections.status',
      ],
      controlPaths: ['xd.xenesis.channels.profileDrafts.open', 'xd.xenesis.channels.profileDrafts.request'],
      diagnostics: [
        'delivery-guardrails',
        `approvalMode:${input.guardrails.approvalMode}`,
        `maxTurns:${input.guardrails.maxTurns}`,
        `maxTokens:${input.guardrails.maxTokens}`,
        ...(input.channelTemplate?.safety?.troubleshooting ?? []),
      ],
      safetyBoundary: 'Delivery guardrail review does not change approval mode or send messages.',
    }),
    channelProfileDraftReviewStep({
      id: 'pairing-readback',
      label: 'Review pairing readback',
      phase: 'pairing-readback',
      expectedState: `${input.label} pairing, routing, and messenger detail readback are visible before channel tests.`,
      requiredFields: input.planned ? ['adapter', 'auth', 'routeScope'] : [],
      readPaths: [
        'xd.xenesis.channels.profileDrafts.status',
        'xd.xenesis.channels.pairing.status',
        'xd.xenesis.channels.routing.status',
        'xd.xenesis.gateway.status',
        'xd.xenesis.messengers.views.status',
      ],
      controlPaths: ['xd.xenesis.channels.profileDrafts.open', 'xd.xenesis.messengers.views.open'],
      diagnostics: [
        'pairing-readback',
        ...(input.channelTemplate?.pairing?.validationChecks ?? []),
        ...(input.channelTemplate?.routing?.diagnostics ?? []),
      ],
      safetyBoundary: 'Pairing readback does not pair external accounts, start adapters, or send test messages.',
    }),
  ];
}

function buildXenesisChannelProfileDraft(
  input: {
    channel: XenesisProfileChannelName;
    label: string;
    status: XenesisConnectionStatus;
    channelTemplate?: XenesisConnectionChannelTemplate;
    warnings?: string[];
  },
  settings: Record<string, unknown> | undefined,
  env: Record<string, string | undefined>,
): XenesisConnectionChannelProfileDraftTemplate {
  const profileFields = XENESIS_CHANNEL_PROFILE_DRAFT_FIELDS[input.channel].map((field) => ({
    field: field.field,
    label: field.label,
    required: field.required,
    secretRef: field.secretRef,
    valueState: channelProfileDraftFieldState(field, settings, env),
    description: field.description,
  }));
  const missingRequiredFields = uniqueStrings(
    profileFields.map((field) =>
      channelProfileDraftMissingFieldKey(
        {
          field: field.field,
          label: field.label,
          required: field.required,
          secretRef: field.secretRef,
          description: field.description,
        },
        field.valueState,
      ),
    ),
  );
  const draftStatus: XenesisConnectionChannelProfileDraftStatus =
    missingRequiredFields.length > 0
      ? 'missing-required-field'
      : settings?.enabled === false || input.status === 'disabled'
        ? 'disabled'
        : 'ready';
  const guardrails = {
    approvalMode: channelProfileDraftApprovalMode(settings?.approvalMode),
    maxTurns: channelProfileDraftPositiveInteger(settings?.maxTurns, 12),
    maxTokens: channelProfileDraftPositiveInteger(settings?.maxTokens, 120000),
  };

  return {
    draftStatus,
    actionInboxKind: 'xenesis-channel-profile-draft',
    channel: input.channel,
    displayName: input.label,
    description: `Review ${input.label} channel profile settings before using updateChannels.`,
    setupSurface: 'Settings > Xenesis Agent > External bots',
    reviewSurface: 'Desk Action Inbox',
    profileFields,
    missingRequiredFields,
    guardrails,
    reviewSteps: channelProfileDraftReviewSteps({
      channel: input.channel,
      label: input.label,
      profileFields,
      missingRequiredFields,
      guardrails,
      channelTemplate: input.channelTemplate,
      planned: false,
    }),
    readPaths: uniqueStrings([
      'xd.xenesis.channels.profileDrafts.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.channels.safety.status',
      'xd.xenesis.channels.accessGroups.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.messengers.views.status',
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.channels.profileDrafts.open',
      'xd.xenesis.channels.profileDrafts.request',
      'xd.xenesis.channels.profileDrafts.apply',
      'xd.xenesis.connections.open',
      'xd.xenesis.messengers.views.open',
    ]),
    diagnostics: uniqueStrings([
      'profile-channel-settings',
      draftStatus,
      ...missingRequiredFields,
      ...profileFields.map((field) => `${field.field}:${field.valueState}`),
      ...(input.channelTemplate?.accessGroups?.diagnostics ?? []),
      ...(input.channelTemplate?.pairing?.diagnostics ?? []),
    ]),
    blockedActions: [...XENESIS_CHANNEL_PROFILE_DRAFT_BLOCKED_ACTIONS],
    safetyBoundaries: uniqueStrings([
      'channel profile draft apply writes profile channel settings only after Capability Registry approval',
      'channel profile draft apply does not store raw secret values or update secret stores',
      'channel profile draft apply does not start gateways or send test messages',
      'secret values are never returned',
      ...(input.channelTemplate?.safetyControls ?? []),
      ...(input.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.pairing?.safetyBoundaries ?? []),
      ...(input.warnings ?? []),
    ]),
  };
}

function buildXenesisPlannedChannelProfileDraft(input: {
  channel: string;
  label: string;
  channelTemplate?: XenesisConnectionChannelTemplate;
  warnings?: string[];
}): XenesisConnectionChannelProfileDraftTemplate {
  const adapter = input.channelTemplate?.adapter ?? 'planned-adapter';
  const auth = input.channelTemplate?.auth ?? 'planned-auth';
  const profileFields: XenesisConnectionChannelProfileDraftField[] = [
    {
      field: 'enabled',
      label: 'Enabled',
      required: false,
      secretRef: false,
      valueState: 'planned',
      description: `Whether ${input.label} delivery is enabled after a verified adapter exists.`,
    },
    {
      field: 'adapter',
      label: 'Adapter',
      required: true,
      secretRef: false,
      valueState: 'planned',
      description: `Planned adapter: ${adapter}.`,
    },
    {
      field: 'auth',
      label: 'Auth',
      required: true,
      secretRef: false,
      valueState: 'planned',
      description: `Planned auth model: ${auth}.`,
    },
    {
      field: 'routeScope',
      label: 'Route scope',
      required: true,
      secretRef: false,
      valueState: 'planned',
      description: 'Allowed accounts, chats, rooms, senders, or topics must be reviewed before accepting prompts.',
    },
  ];
  const guardrails: XenesisConnectionChannelProfileDraftGuardrails = {
    approvalMode: 'readonly',
    maxTurns: 12,
    maxTokens: 120000,
  };

  return {
    draftStatus: 'planned',
    actionInboxKind: 'xenesis-channel-profile-draft',
    channel: input.channel,
    displayName: input.label,
    description: `Review planned ${input.label} channel profile intent before runtime adapter work starts.`,
    setupSurface: 'Settings > Xenesis Agent > Connections',
    reviewSurface: 'Desk Action Inbox',
    profileFields,
    missingRequiredFields: [],
    guardrails,
    reviewSteps: channelProfileDraftReviewSteps({
      channel: input.channel,
      label: input.label,
      profileFields,
      missingRequiredFields: [],
      guardrails,
      channelTemplate: input.channelTemplate,
      planned: true,
    }),
    readPaths: uniqueStrings([
      'xd.xenesis.channels.profileDrafts.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.channels.safety.status',
      'xd.xenesis.channels.accessGroups.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.channels.userStories.status',
      'xd.xenesis.messengers.views.status',
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.channels.profileDrafts.open',
      'xd.xenesis.channels.profileDrafts.request',
      'xd.xenesis.connections.open',
      'xd.xenesis.messengers.views.open',
    ]),
    diagnostics: uniqueStrings([
      'profile-draft-planned',
      'planned-adapter',
      `adapter:${adapter}`,
      `auth:${auth}`,
      ...(input.channelTemplate?.routing?.diagnostics ?? []),
      ...(input.channelTemplate?.safety?.troubleshooting ?? []),
      ...(input.channelTemplate?.accessGroups?.diagnostics ?? []),
      ...(input.channelTemplate?.pairing?.diagnostics ?? []),
      ...(input.channelTemplate?.userStory?.diagnostics ?? []),
    ]),
    blockedActions: [...XENESIS_CHANNEL_PROFILE_DRAFT_BLOCKED_ACTIONS],
    safetyBoundaries: uniqueStrings([
      'planned channel profile drafts are review-only',
      'planned channel profile draft does not mutate channel settings or update allowlists',
      'planned channel profile draft does not write profile config or send test messages',
      'planned channel profile draft does not start gateway delivery adapters',
      'secret values are never returned',
      ...(input.channelTemplate?.safetyControls ?? []),
      ...(input.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.pairing?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.userStory?.safetyBoundaries ?? []),
      ...(input.warnings ?? []),
    ]),
  };
}

function buildXenesisMcpInstallDraft(
  item: XenesisConnectionItem,
  env: Record<string, string | undefined>,
): XenesisConnectionMcpInstallDraftTemplate | undefined {
  const installPlan = item.toolInstallPlan;
  if (!item.mcpTemplate && !installPlan) return undefined;

  const requiredEnv = uniqueStrings([...(item.mcpTemplate?.requiredEnv ?? []), ...(installPlan?.requiredEnv ?? [])]);
  const missingEnv = missingEnvFor(requiredEnv, env);
  const draftStatus: XenesisConnectionMcpInstallDraftStatus = item.mcpTemplate
    ? missingEnv.length > 0
      ? 'missing-env'
      : 'ready'
    : 'planned';
  const configTargets = item.mcpTemplate ? (installPlan?.configTargets ?? ['json-mcp-config', 'codex-toml']) : [];
  const installSteps = installPlan?.installSteps ?? item.setupSteps ?? [];

  return {
    draftStatus,
    actionInboxKind: 'xenesis-mcp-install-draft',
    ...(item.mcpTemplate
      ? {
          serverName: item.mcpTemplate.serverName,
          description: item.mcpTemplate.description,
          transport: item.mcpTemplate.transport,
          auth: item.mcpTemplate.auth ?? 'none',
          configSnippets: item.mcpTemplate.configSnippets,
        }
      : {}),
    displayName: item.mcpTemplate?.displayName ?? item.label,
    installSurface:
      installPlan?.installSurface ?? item.toolConnector?.setupSurface ?? 'Settings > AI Provider > Local CLI MCP',
    reviewSurface: 'Desk Action Inbox',
    configTargets,
    requiredEnv,
    missingEnv,
    installSteps,
    readPaths: uniqueStrings([
      'xd.xenesis.tools.mcpInstallDrafts.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.installPlans.status',
      'xd.xenesis.tools.connectors.status',
      'xd.mcp.settings.status',
      ...(installPlan?.readPaths ?? []),
      ...(item.toolConnector?.readPaths ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.tools.mcpInstallDrafts.open',
      'xd.xenesis.tools.mcpInstallDrafts.request',
      ...(draftStatus === 'ready' ? ['xd.xenesis.tools.mcpInstallDrafts.apply'] : []),
      'xd.xenesis.connections.open',
      ...(installPlan?.controlPaths ?? []),
      ...(item.toolConnector?.controlPaths ?? []),
    ]),
    diagnostics: uniqueStrings([
      draftStatus,
      ...(missingEnv.length > 0 ? ['missing-env'] : []),
      ...(item.mcpTemplate ? ['template-snippet'] : ['planned-template-missing']),
      ...(installPlan?.diagnostics ?? []),
      ...(item.toolConnector?.diagnostics ?? []),
    ]),
    blockedActions: [...XENESIS_MCP_INSTALL_DRAFT_BLOCKED_ACTIONS],
    safetyBoundaries: uniqueStrings([
      'MCP install drafts are review-only',
      'MCP install draft apply allows approval-gated MCP config writes only for ready drafts',
      'MCP install draft review does not write MCP config or run shell commands',
      'MCP install drafts do not complete OAuth, store tokens, execute provider tools, mutate settings, or send messages',
      'credential values are never returned',
      ...(installPlan?.safetyBoundaries ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.warnings ?? []),
    ]),
  };
}

function toolOAuthDraftField(
  field: string,
  label: string,
  required: boolean,
  secretRef: boolean,
  valueState: XenesisConnectionToolOAuthDraftFieldValueState,
  source: string,
  description: string,
): XenesisConnectionToolOAuthDraftField {
  return {
    field,
    label,
    required,
    secretRef,
    valueState,
    source,
    description,
  };
}

function toolOAuthDraftReviewStep(
  input: XenesisConnectionToolOAuthDraftReviewStep,
): XenesisConnectionToolOAuthDraftReviewStep {
  return {
    ...input,
    requiredFields: uniqueStrings(input.requiredFields),
    readPaths: uniqueStrings(input.readPaths),
    controlPaths: uniqueStrings(input.controlPaths),
    diagnostics: uniqueStrings(input.diagnostics),
  };
}

function toolOAuthDraftReviewSteps(
  item: XenesisConnectionItem,
  scopes: string[],
): XenesisConnectionToolOAuthDraftReviewStep[] {
  return [
    toolOAuthDraftReviewStep({
      id: 'oauth-app-registration',
      label: 'Review OAuth app registration',
      phase: 'oauth-app-registration',
      expectedState: `${item.label} OAuth client, redirect URI, and selected MCP OAuth app requirements are visible before OAuth starts.`,
      requiredFields: ['oauthClient', 'redirectUri'],
      readPaths: [
        'xd.xenesis.tools.oauthDrafts.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.installPlans.status',
      ],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.open', 'xd.xenesis.tools.oauthDrafts.request'],
      diagnostics: ['oauth-app-registration', 'planned-oauth-template', 'mcp-settings-status'],
      safetyBoundary: 'OAuth app review does not create OAuth apps, expose client secrets, or complete OAuth.',
    }),
    toolOAuthDraftReviewStep({
      id: 'scope-review',
      label: 'Review OAuth scopes',
      phase: 'scope-review',
      expectedState: `${item.label} read scopes are reviewed and write scopes remain blocked until a verified template exists.`,
      requiredFields: ['scopes', 'consentReview'],
      readPaths: [
        'xd.xenesis.tools.oauthDrafts.status',
        'xd.xenesis.tools.actions.status',
        'xd.xenesis.tools.connectors.status',
      ],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.open', 'xd.xenesis.tools.oauthDrafts.request'],
      diagnostics: ['scope-review', ...scopes],
      safetyBoundary: 'Scope review does not grant consent, start OAuth, or enable Google write actions.',
    }),
    toolOAuthDraftReviewStep({
      id: 'token-store-readiness',
      label: 'Review token-store readiness',
      phase: 'token-store-readiness',
      expectedState: `${item.label} token storage remains planned until a selected MCP OAuth template owns the store.`,
      requiredFields: ['tokenStore'],
      readPaths: ['xd.xenesis.tools.oauthDrafts.status', 'xd.mcp.settings.status'],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.open', 'xd.xenesis.tools.oauthDrafts.request'],
      diagnostics: ['token-store-readiness', 'token-store-review', 'mcp-settings-status'],
      safetyBoundary: 'Token-store review does not create files, store tokens, or return credential values.',
    }),
    toolOAuthDraftReviewStep({
      id: 'readback-verification',
      label: 'Review readback verification',
      phase: 'readback-verification',
      expectedState: `${item.label} read-only validation checks are identified before provider tool execution is enabled.`,
      requiredFields: [],
      readPaths: [
        'xd.xenesis.connections.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.oauthDrafts.status',
        'xd.mcp.settings.status',
      ],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.open'],
      diagnostics: ['readback-verification', ...(item.toolConnector?.validationChecks ?? []), 'cr-readback'],
      safetyBoundary: 'Readback verification is read-only and does not execute provider tools.',
    }),
  ];
}

function toolOAuthSetupPacketCredentialRef(
  ref: string,
  label: string,
  source: string,
  description: string,
): XenesisConnectionToolOAuthSetupPacketCredentialRef {
  return {
    ref,
    label,
    required: true,
    secretRef: true,
    valueState: 'planned',
    source,
    description,
  };
}

function buildXenesisToolOAuthSetupPacket(input: {
  item: XenesisConnectionItem;
  scopes: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}): XenesisConnectionToolOAuthSetupPacket {
  const { item, scopes, blockedActions, safetyBoundaries } = input;
  const readPaths = uniqueStrings([
    'xd.xenesis.connections.status',
    'xd.xenesis.tools.oauthDrafts.status',
    'xd.xenesis.tools.oauthDrafts.setupPacket',
    'xd.xenesis.tools.connectors.status',
    'xd.xenesis.tools.installPlans.status',
    'xd.xenesis.tools.actions.status',
    'xd.mcp.settings.status',
  ]);
  const controlPaths = uniqueStrings([
    'xd.xenesis.tools.oauthDrafts.open',
    'xd.xenesis.tools.oauthDrafts.request',
    'xd.xenesis.connections.open',
  ]);
  const diagnostics = uniqueStrings([
    'oauth-setup-packet',
    'oauth-app-registration',
    'scope-review',
    'token-store-readiness',
    'oauth-consent-review',
    'cr-readback',
    ...(item.toolConnector?.diagnostics ?? []),
  ]);

  return {
    packetStatus: 'planned-template',
    provider: 'google',
    tool: item.id,
    displayName: item.label,
    setupSurface: item.toolConnector?.setupSurface ?? 'Settings > AI Provider > Local CLI MCP',
    reviewSurface: 'Desk Action Inbox',
    redirectUriPolicy:
      'Use the redirect URI required by the selected MCP OAuth server; Desk does not start an OAuth callback server from this draft.',
    redirectUriCandidates: ['selected MCP OAuth redirect URI'],
    credentialRefs: [
      toolOAuthSetupPacketCredentialRef(
        'GOOGLE_OAUTH_CLIENT_ID',
        'Google OAuth client id',
        'selected MCP OAuth app',
        'OAuth client id readiness state for the selected MCP server.',
      ),
      toolOAuthSetupPacketCredentialRef(
        'GOOGLE_OAUTH_CLIENT_SECRET',
        'Google OAuth client secret',
        'selected MCP OAuth app',
        'OAuth client secret readiness state for the selected MCP server; the value is never returned.',
      ),
      toolOAuthSetupPacketCredentialRef(
        'GOOGLE_OAUTH_TOKEN_STORE',
        'Google OAuth token store',
        'selected MCP OAuth token store',
        'Token storage readiness state for the selected MCP OAuth flow; tokens are never returned.',
      ),
    ],
    scopes,
    tokenStore: 'selected MCP OAuth token store',
    consentMode: 'review-only',
    checklist: [
      `Create or select a Google OAuth app for ${item.label}.`,
      'Register the selected MCP OAuth redirect URI before starting OAuth.',
      'Review the read-only scopes listed in this setup packet.',
      'Prepare the selected MCP OAuth token store without storing tokens in Desk chat.',
      'Do not paste OAuth client secrets into chat, docs, logs, or Action Inbox notes.',
      'Request Desk Action Inbox review before any OAuth flow is started.',
    ],
    readPaths,
    controlPaths,
    diagnostics,
    blockedActions: uniqueStrings(blockedActions),
    safetyBoundaries: uniqueStrings([
      'tool OAuth setup packets are review-only',
      'tool OAuth setup packet does not complete OAuth, store tokens, write MCP config, execute provider tools, mutate settings, send email, mutate documents, or mutate calendar events',
      ...safetyBoundaries,
    ]),
  };
}

function buildXenesisToolOAuthDraft(item: XenesisConnectionItem): XenesisConnectionToolOAuthDraftTemplate | undefined {
  if (!(XENESIS_CONNECTION_TOOL_OAUTH_DRAFT_IDS as readonly string[]).includes(item.id)) return undefined;
  if (item.toolConnector?.authMode !== 'oauth') return undefined;

  const missingRequiredFields = ['oauthClient', 'redirectUri', 'tokenStore'];
  const scopes = uniqueStrings(item.toolConnector.dataScopes);
  const reviewSteps = toolOAuthDraftReviewSteps(item, scopes);
  const calendarBlockedActions =
    item.id === 'google-calendar'
      ? ['create/update/delete calendar events without approval', 'mutate calendar events']
      : [];
  const workspaceBlockedActions =
    item.id === 'google-workspace' ? ['send email', 'mutate Google documents', 'mutate documents'] : [];
  const blockedActions = uniqueStrings([
    ...XENESIS_TOOL_OAUTH_DRAFT_BLOCKED_ACTIONS,
    ...workspaceBlockedActions,
    ...calendarBlockedActions,
  ]);
  const safetyBoundaries = uniqueStrings([
    'tool OAuth drafts are review-only',
    'tool OAuth draft does not complete OAuth, store tokens, write MCP config, execute provider tools, mutate settings, send email, mutate documents, or mutate calendar events',
    'credential values, OAuth client secrets, OAuth tokens, and consent responses are never returned',
    'Google tool writes require separate verified approval-gated execution paths',
    ...(item.toolConnector.safetyBoundaries ?? []),
    ...(item.toolInstallPlan?.safetyBoundaries ?? []),
    ...(item.toolActionCatalog?.safetyBoundaries ?? []),
    ...(item.warnings ?? []),
  ]);
  const setupPacket = buildXenesisToolOAuthSetupPacket({ item, scopes, blockedActions, safetyBoundaries });

  return {
    draftStatus: 'planned-template',
    actionInboxKind: 'xenesis-tool-oauth-draft',
    tool: item.id,
    displayName: item.label,
    description: `Review ${item.label} OAuth app, scopes, consent, and token-store readiness before any OAuth flow exists.`,
    runtimeSupport: item.toolConnector.runtimeSupport === 'ready-template' ? 'ready-template' : 'planned-oauth',
    authSurface: item.toolConnector.setupSurface,
    reviewSurface: 'Desk Action Inbox',
    profileFields: [
      toolOAuthDraftField(
        'oauthClient',
        'OAuth client',
        true,
        true,
        'planned',
        'selected MCP OAuth app',
        'OAuth client id and secret readiness state for the selected MCP server.',
      ),
      toolOAuthDraftField(
        'redirectUri',
        'Redirect URI',
        true,
        false,
        'planned',
        'selected MCP OAuth app',
        'Redirect URI expected by the selected MCP OAuth flow.',
      ),
      toolOAuthDraftField(
        'scopes',
        'OAuth scopes',
        true,
        false,
        scopes.length > 0 ? 'configured' : 'missing',
        'tool connector data scopes',
        'Read scopes proposed by the Connection Center for review.',
      ),
      toolOAuthDraftField(
        'tokenStore',
        'Token store',
        true,
        true,
        'planned',
        'selected MCP OAuth token store',
        'Token storage is not configured until a verified MCP/OAuth template is selected.',
      ),
      toolOAuthDraftField(
        'consentReview',
        'Consent review',
        false,
        false,
        'planned',
        'Desk Action Inbox review',
        'Human review record for requested scopes and OAuth boundaries.',
      ),
    ],
    missingRequiredFields,
    scopes,
    tokenStore: 'selected MCP OAuth token store',
    consentMode: 'review-only',
    setupPacket,
    reviewSteps,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.oauthDrafts.status',
      'xd.xenesis.tools.oauthDrafts.setupPacket',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.installPlans.status',
      'xd.xenesis.tools.actions.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: [
      'xd.xenesis.tools.oauthDrafts.open',
      'xd.xenesis.tools.oauthDrafts.request',
      'xd.xenesis.connections.open',
    ],
    diagnostics: uniqueStrings([
      'planned-oauth-template',
      'scope-review',
      'token-store-review',
      'oauth-consent-review',
      'cr-readback',
      ...(item.toolConnector.diagnostics ?? []),
    ]),
    blockedActions,
    safetyBoundaries,
  };
}

function providerSetupPlanRuntimeSupport(
  item: XenesisConnectionItem,
): XenesisConnectionProviderSetupPlanRuntimeSupport {
  return item.providerProfileDraft?.draftStatus === 'ready' ? 'configured-provider' : 'missing-required-field';
}

function providerSetupPlanStep(input: {
  id: string;
  label: string;
  kind: XenesisConnectionProviderSetupPlanStepKind;
  crPath: string;
  args?: Record<string, unknown>;
  expectedState: string;
  verifyWith?: string[];
  safetyBoundary: string;
}): XenesisConnectionProviderSetupPlanStep {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    crPath: input.crPath,
    ...(input.args ? { args: input.args } : {}),
    expectedState: input.expectedState,
    verifyWith: uniqueStrings(input.verifyWith ?? []),
    safetyBoundary: input.safetyBoundary,
  };
}

function providerSetupPlanSteps(item: XenesisConnectionItem): XenesisConnectionProviderSetupPlanStep[] {
  const provider =
    item.providerSetup?.provider ?? item.providerProfileDraft?.provider ?? item.id.replace(/^provider-/, '');
  const providerArgs = { provider };
  return [
    ...(item.providerSetup
      ? [
          providerSetupPlanStep({
            id: 'provider-setup',
            label: 'Read provider setup',
            kind: 'read',
            crPath: 'xd.xenesis.providers.setup.status',
            args: providerArgs,
            expectedState: `${provider} provider credentials, model, endpoint, runtime profile, fallback policy, and retry policy are visible.`,
            verifyWith: item.providerSetup.verification,
            safetyBoundary: 'provider setup reads do not change provider settings or expose secrets',
          }),
        ]
      : []),
    ...(item.providerRouting
      ? [
          providerSetupPlanStep({
            id: 'provider-routing',
            label: 'Read provider routing',
            kind: 'read',
            crPath: 'xd.xenesis.providers.routing.status',
            args: providerArgs,
            expectedState: `${provider} active route, fallback chain, retry policy, and credential pool states are visible.`,
            verifyWith: item.providerRouting.diagnostics,
            safetyBoundary: 'provider routing reads do not edit fallback chains or credential pools',
          }),
        ]
      : []),
    ...(item.providerView
      ? [
          providerSetupPlanStep({
            id: 'provider-view',
            label: 'Open provider view',
            kind: 'open',
            crPath: 'xd.xenesis.providers.views.open',
            args: { ...providerArgs, ensureVisible: true },
            expectedState: `${provider} provider setup surfaces can be focused inside Connection Center.`,
            verifyWith: item.providerView.diagnostics,
            safetyBoundary: 'provider view opens internal Desk surfaces only',
          }),
        ]
      : []),
    ...(item.providerProfileDraft
      ? [
          providerSetupPlanStep({
            id: 'provider-profile-draft',
            label: 'Review provider profile draft',
            kind: 'request',
            crPath: 'xd.xenesis.providers.profileDrafts.request',
            args: providerArgs,
            expectedState: `${provider} provider profile fields and guardrails can be reviewed before settings mutations.`,
            verifyWith: item.providerProfileDraft.diagnostics,
            safetyBoundary: 'provider profile draft review records local Action Inbox items only',
          }),
        ]
      : []),
    ...(item.providerProfileDraft?.controlPaths.includes('xd.xenesis.providers.profileDrafts.apply')
      ? [
          providerSetupPlanStep({
            id: 'provider-profile-apply',
            label: 'Apply provider profile draft',
            kind: 'apply',
            crPath: 'xd.xenesis.providers.profileDrafts.apply',
            args: providerArgs,
            expectedState: `${provider} non-secret provider profile settings can be applied only after Capability Registry approval.`,
            verifyWith: item.providerProfileDraft.reviewSteps.flatMap((step) => step.diagnostics),
            safetyBoundary: 'provider profile apply mutates only non-secret provider settings after approval',
          }),
        ]
      : []),
    providerSetupPlanStep({
      id: 'diagnostic-runbook',
      label: 'Open diagnostic runbook',
      kind: 'open',
      crPath: 'xd.xenesis.connections.diagnostics.open',
      args: { id: item.id },
      expectedState: `${item.label} diagnostic runbook can be opened for readback verification.`,
      verifyWith: item.diagnosticRunbook?.diagnostics ?? ['cr-readback'],
      safetyBoundary: 'diagnostic runbooks are read/open planning surfaces',
    }),
    providerSetupPlanStep({
      id: 'setup-request',
      label: 'Request setup review',
      kind: 'request',
      crPath: 'xd.xenesis.connections.setupRequests.request',
      args: { id: item.id },
      expectedState: `${item.label} setup review can be recorded in Desk Action Inbox before provider setup work.`,
      verifyWith: item.setupRequest?.diagnostics ?? ['action-inbox-review'],
      safetyBoundary: 'setup request review records local Action Inbox items only',
    }),
  ];
}

function buildXenesisProviderSetupPlan(
  item: XenesisConnectionItem,
): XenesisConnectionProviderSetupPlanTemplate | undefined {
  if (item.kind !== 'provider') return undefined;
  const steps = providerSetupPlanSteps(item);
  const provider =
    item.providerSetup?.provider ?? item.providerProfileDraft?.provider ?? item.id.replace(/^provider-/, '');
  return {
    planStatus: diagnosticRunbookReadiness(item.status),
    runtimeSupport: providerSetupPlanRuntimeSupport(item),
    guideId: 'onboarding-connections',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    primarySurface: item.providerView?.primarySurface ?? 'Settings > Xenesis Agent > Connections',
    setupSurface:
      item.providerView?.setupSurface ?? item.providerProfileDraft?.setupSurface ?? 'Settings > AI Provider',
    reviewSurface: 'Desk Action Inbox',
    steps,
    readPaths: uniqueStrings([
      'xd.xenesis.providers.setupPlans.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.guides.status',
      'xd.xenesis.connections.diagnostics.status',
      'xd.xenesis.connections.setupRequests.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.providers.views.status',
      'xd.xenesis.providers.profileDrafts.status',
      'xd.xenesis.status',
      ...(item.providerSetup?.crReadPaths ?? []),
      ...(item.providerRouting?.readPaths ?? []),
      ...(item.providerView?.readPaths ?? []),
      ...(item.providerProfileDraft?.readPaths ?? []),
      ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.readPaths) ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.providers.setupPlans.open',
      'xd.xenesis.connections.open',
      'xd.xenesis.guides.open',
      'xd.xenesis.connections.diagnostics.open',
      'xd.xenesis.connections.setupRequests.request',
      ...(item.providerView?.controlPaths ?? []),
      ...(item.providerProfileDraft?.controlPaths ?? []),
      ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.controlPaths) ?? []),
    ]),
    diagnostics: uniqueStrings([
      'provider-setup-plan',
      provider,
      ...(item.providerSetup?.verification ?? []),
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.diagnostics ?? []),
      ...(item.providerRouting?.credentialPools.map((pool) => pool.apiKeyEnv) ?? []),
      ...(item.providerView?.diagnostics ?? []),
      ...(item.providerProfileDraft?.diagnostics ?? []),
      ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.diagnostics) ?? []),
    ]),
    blockedActions: uniqueStrings([
      ...XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS,
      'change active provider',
      'write provider settings from setup plan metadata',
      'store raw provider secrets',
      'edit provider fallback chains',
      'change local CLI selection',
      'run provider prompts',
      ...(item.providerProfileDraft?.blockedActions ?? []),
    ]),
    safetyBoundaries: uniqueStrings([
      'provider setup plans are read/open orchestration metadata',
      'setup plans do not change provider settings, store raw secrets, edit fallback chains, change local CLI selection, run provider prompts, or bypass approvals',
      'setup plans do not change provider settings',
      'ready provider setup plans reference only existing approval-gated profile draft apply paths',
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.safetyBoundaries ?? []),
      ...(item.providerView?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
    ]),
  };
}

function withXenesisConnectionProviderSetupPlan(item: XenesisConnectionItem): XenesisConnectionItem {
  const providerSetupPlan = buildXenesisProviderSetupPlan(item);
  if (!providerSetupPlan) return item;
  return { ...item, providerSetupPlan };
}

function withXenesisConnectionProviderSetupPlans(
  sections: XenesisConnectionsStatus['sections'],
): XenesisConnectionsStatus['sections'] {
  return Object.fromEntries(
    Object.entries(sections).map(([id, section]) => [
      id,
      { ...section, items: section.items.map((item) => withXenesisConnectionProviderSetupPlan(item)) },
    ]),
  ) as XenesisConnectionsStatus['sections'];
}

function toolSetupPlanRuntimeSupport(item: XenesisConnectionItem): XenesisConnectionToolSetupPlanRuntimeSupport {
  if (
    item.toolInstallPlan?.runtimeSupport === 'planned-oauth' ||
    item.toolConnector?.runtimeSupport === 'planned-oauth' ||
    item.toolOAuthDraft?.runtimeSupport === 'planned-oauth'
  ) {
    return 'planned-oauth';
  }
  if (item.toolUserStory?.runtimeSupport === 'ready-local') return 'ready-local';
  return 'ready-template';
}

function toolSetupPlanStep(input: {
  id: string;
  label: string;
  kind: XenesisConnectionToolSetupPlanStepKind;
  crPath: string;
  itemId: string;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}): XenesisConnectionToolSetupPlanStep {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    crPath: input.crPath,
    args: { id: input.itemId },
    expectedState: input.expectedState,
    verifyWith: uniqueStrings(input.verifyWith),
    safetyBoundary: input.safetyBoundary,
  };
}

function toolSetupPlanSteps(item: XenesisConnectionItem): XenesisConnectionToolSetupPlanStep[] {
  return [
    ...(item.toolView
      ? [
          toolSetupPlanStep({
            id: 'tool-view',
            label: 'Open tool view',
            kind: 'open',
            crPath: 'xd.xenesis.tools.views.open',
            itemId: item.id,
            expectedState: `${item.label} internal Desk view is focusable before setup work starts.`,
            verifyWith: item.toolView.diagnostics,
            safetyBoundary: 'tool view opens do not mutate provider settings or external systems',
          }),
        ]
      : []),
    ...(item.toolSetup
      ? [
          toolSetupPlanStep({
            id: 'tool-setup',
            label: 'Read tool setup',
            kind: 'read',
            crPath: 'xd.xenesis.tools.setup.status',
            itemId: item.id,
            expectedState: `${item.label} auth mode, scopes, credential storage, and verification checks are visible.`,
            verifyWith: item.toolSetup.verification,
            safetyBoundary: 'tool setup reads do not install servers or store credentials',
          }),
        ]
      : []),
    ...(item.toolConnector
      ? [
          toolSetupPlanStep({
            id: 'tool-connector',
            label: 'Read connector readiness',
            kind: 'read',
            crPath: 'xd.xenesis.tools.connectors.status',
            itemId: item.id,
            expectedState: `${item.label} connector type, credential state, and validation checks are redacted and reviewable.`,
            verifyWith: item.toolConnector.diagnostics,
            safetyBoundary: 'connector reads never return raw credential values',
          }),
        ]
      : []),
    ...(item.toolInstallPlan
      ? [
          toolSetupPlanStep({
            id: 'tool-install-plan',
            label: 'Read install plan',
            kind: 'read',
            crPath: 'xd.xenesis.tools.installPlans.status',
            itemId: item.id,
            expectedState: `${item.label} install mode, config targets, required env, and install steps are reviewable.`,
            verifyWith: item.toolInstallPlan.diagnostics,
            safetyBoundary: 'install-plan reads do not execute installs or write MCP config',
          }),
        ]
      : []),
    ...(item.mcpInstallDraft
      ? [
          toolSetupPlanStep({
            id: 'mcp-install-draft',
            label: 'Review MCP install draft',
            kind: 'request',
            crPath: 'xd.xenesis.tools.mcpInstallDrafts.request',
            itemId: item.id,
            expectedState: `${item.label} MCP install draft can be reviewed before any approval-gated config write.`,
            verifyWith: item.mcpInstallDraft.diagnostics,
            safetyBoundary: 'MCP install draft review does not write config or run shell commands',
          }),
        ]
      : []),
    ...(item.toolOAuthDraft
      ? [
          toolSetupPlanStep({
            id: 'oauth-draft',
            label: 'Read OAuth draft',
            kind: 'read',
            crPath: 'xd.xenesis.tools.oauthDrafts.status',
            itemId: item.id,
            expectedState: `${item.label} OAuth app, scope, consent, and token-store draft is reviewable.`,
            verifyWith: item.toolOAuthDraft.diagnostics,
            safetyBoundary: 'OAuth draft reads do not complete OAuth or store tokens',
          }),
          toolSetupPlanStep({
            id: 'oauth-setup-packet',
            label: 'Read OAuth setup packet',
            kind: 'read',
            crPath: 'xd.xenesis.tools.oauthDrafts.setupPacket',
            itemId: item.id,
            expectedState: `${item.label} OAuth registration, redirect URI, credential refs, and token-store checklist are reviewable.`,
            verifyWith: item.toolOAuthDraft.setupPacket.diagnostics,
            safetyBoundary: 'OAuth setup packet reads do not complete OAuth, store tokens, or write MCP config',
          }),
        ]
      : []),
    ...(item.toolActionCatalog
      ? [
          toolSetupPlanStep({
            id: 'tool-actions',
            label: 'Read tool action policy',
            kind: 'read',
            crPath: 'xd.xenesis.tools.actions.status',
            itemId: item.id,
            expectedState: `${item.label} read/write action groups and approval policy boundaries are visible before tool use.`,
            verifyWith: item.toolActionCatalog.diagnostics,
            safetyBoundary: 'tool action policy reads do not execute provider tools',
          }),
        ]
      : []),
    ...(item.toolUserStory
      ? [
          toolSetupPlanStep({
            id: 'tool-user-stories',
            label: 'Read tool user stories',
            kind: 'read',
            crPath: 'xd.xenesis.tools.userStories.status',
            itemId: item.id,
            expectedState: `${item.label} user-story workflows and prerequisite connectors are visible before runtime use.`,
            verifyWith: item.toolUserStory.diagnostics,
            safetyBoundary: 'tool user-story reads do not execute workflows or mutate external systems',
          }),
        ]
      : []),
    toolSetupPlanStep({
      id: 'diagnostic-runbook',
      label: 'Open diagnostic runbook',
      kind: 'open',
      crPath: 'xd.xenesis.connections.diagnostics.open',
      itemId: item.id,
      expectedState: `${item.label} diagnostic runbook can be opened for readback verification.`,
      verifyWith: item.diagnosticRunbook?.diagnostics ?? ['cr-readback'],
      safetyBoundary: 'diagnostic runbooks are read/open planning surfaces',
    }),
    toolSetupPlanStep({
      id: 'setup-request',
      label: 'Request setup review',
      kind: 'request',
      crPath: 'xd.xenesis.connections.setupRequests.request',
      itemId: item.id,
      expectedState: `${item.label} setup review can be recorded in Desk Action Inbox before external work.`,
      verifyWith: item.setupRequest?.diagnostics ?? ['action-inbox-review'],
      safetyBoundary: 'setup request review records local Action Inbox items only',
    }),
  ];
}

function buildXenesisToolSetupPlan(item: XenesisConnectionItem): XenesisConnectionToolSetupPlanTemplate | undefined {
  if (item.kind !== 'tool') return undefined;
  const steps = toolSetupPlanSteps(item);
  const setupSurface =
    item.toolSetup?.setupSurface ?? item.toolView?.setupSurface ?? 'Settings > Xenesis Agent > Connections';
  return {
    planStatus: diagnosticRunbookReadiness(item.status),
    runtimeSupport: toolSetupPlanRuntimeSupport(item),
    guideId: 'external-tool-integrations',
    guidePath: 'docs/manual/11-external-tool-integrations.md',
    primarySurface: item.toolView?.primarySurface ?? 'Settings > Xenesis Agent > Connections',
    setupSurface,
    reviewSurface: 'Desk Action Inbox',
    steps,
    readPaths: uniqueStrings([
      'xd.xenesis.tools.setupPlans.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.guides.status',
      'xd.xenesis.connections.diagnostics.status',
      'xd.xenesis.connections.setupRequests.status',
      ...(item.toolView?.readPaths ?? []),
      ...(item.toolSetup?.crReadPaths ?? []),
      ...(item.toolConnector?.readPaths ?? []),
      ...(item.toolInstallPlan?.readPaths ?? []),
      ...(item.mcpInstallDraft?.readPaths ?? []),
      ...(item.toolOAuthDraft?.readPaths ?? []),
      ...(item.toolOAuthDraft?.setupPacket.readPaths ?? []),
      ...(item.toolActionCatalog?.readPaths ?? []),
      ...(item.toolUserStory?.readPaths ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.tools.setupPlans.open',
      'xd.xenesis.connections.open',
      'xd.xenesis.guides.open',
      'xd.xenesis.connections.diagnostics.open',
      'xd.xenesis.connections.setupRequests.request',
      ...(item.toolView?.controlPaths ?? []),
      ...(item.toolConnector?.controlPaths ?? []),
      ...(item.toolInstallPlan?.controlPaths ?? []),
      ...(item.mcpInstallDraft?.controlPaths ?? []),
      ...(item.toolOAuthDraft?.controlPaths ?? []),
      ...(item.toolOAuthDraft?.setupPacket.controlPaths ?? []),
      ...(item.toolActionCatalog?.controlPaths ?? []),
      ...(item.toolUserStory?.controlPaths ?? []),
    ]),
    diagnostics: uniqueStrings([
      'tool-setup-plan',
      ...(item.toolView?.diagnostics ?? []),
      ...(item.toolSetup?.verification ?? []),
      ...(item.toolConnector?.diagnostics ?? []),
      ...(item.toolInstallPlan?.diagnostics ?? []),
      ...(item.mcpInstallDraft?.diagnostics ?? []),
      ...(item.toolOAuthDraft?.diagnostics ?? []),
      ...(item.toolOAuthDraft?.setupPacket.diagnostics ?? []),
      ...(item.toolActionCatalog?.diagnostics ?? []),
      ...(item.toolUserStory?.diagnostics ?? []),
    ]),
    blockedActions: uniqueStrings([
      ...XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS,
      ...(item.mcpInstallDraft?.blockedActions ?? []),
      ...(item.toolOAuthDraft?.blockedActions ?? []),
      ...(item.toolOAuthDraft?.setupPacket.blockedActions ?? []),
      ...(item.toolActionCatalog?.blockedActions ?? []),
      ...(item.toolOAuthDraft ? ['complete OAuth or store Google OAuth tokens'] : []),
    ]),
    safetyBoundaries: uniqueStrings([
      'tool setup plans are review-only orchestration metadata',
      'setup plans do not execute provider tools or mutate external systems',
      'setup plans do not complete OAuth, store tokens, write MCP config, send messages, or bypass approvals',
      ...(item.toolView?.safetyBoundaries ?? []),
      ...(item.toolSetup?.riskControls ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.toolInstallPlan?.safetyBoundaries ?? []),
      ...(item.mcpInstallDraft?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.setupPacket.safetyBoundaries ?? []),
      ...(item.toolActionCatalog?.safetyBoundaries ?? []),
      ...(item.toolUserStory?.safetyBoundaries ?? []),
    ]),
  };
}

function withXenesisConnectionToolSetupPlan(item: XenesisConnectionItem): XenesisConnectionItem {
  const toolSetupPlan = buildXenesisToolSetupPlan(item);
  if (!toolSetupPlan) return item;
  return { ...item, toolSetupPlan };
}

function withXenesisConnectionToolSetupPlans(
  sections: XenesisConnectionsStatus['sections'],
): XenesisConnectionsStatus['sections'] {
  return Object.fromEntries(
    Object.entries(sections).map(([id, section]) => [
      id,
      { ...section, items: section.items.map((item) => withXenesisConnectionToolSetupPlan(item)) },
    ]),
  ) as XenesisConnectionsStatus['sections'];
}

function channelSetupPlanRuntimeSupport(item: XenesisConnectionItem): XenesisConnectionChannelSetupPlanRuntimeSupport {
  return item.messengerView?.runtimeSupport === 'implemented' ||
    item.channelTemplate?.pairing?.runtimeSupport === 'implemented'
    ? 'implemented'
    : 'planned-adapter';
}

function channelSetupPlanStep(input: {
  id: string;
  label: string;
  kind: XenesisConnectionChannelSetupPlanStepKind;
  crPath: string;
  args: Record<string, unknown>;
  expectedState: string;
  verifyWith: string[];
  safetyBoundary: string;
}): XenesisConnectionChannelSetupPlanStep {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    crPath: input.crPath,
    args: input.args,
    expectedState: input.expectedState,
    verifyWith: uniqueStrings(input.verifyWith),
    safetyBoundary: input.safetyBoundary,
  };
}

function channelSetupPlanSteps(item: XenesisConnectionItem): XenesisConnectionChannelSetupPlanStep[] {
  const idArgs = { id: item.id };
  const channelArgs = { channel: item.id };
  return [
    ...(item.messengerView
      ? [
          channelSetupPlanStep({
            id: 'messenger-view',
            label: 'Open messenger view',
            kind: 'open',
            crPath: 'xd.xenesis.messengers.views.open',
            args: idArgs,
            expectedState: `${item.label} internal Desk messenger view is focusable before setup work starts.`,
            verifyWith: item.messengerView.diagnostics,
            safetyBoundary: 'messenger view opens do not start gateways, pair accounts, or send messages',
          }),
        ]
      : []),
    ...(item.channelTemplate?.routing
      ? [
          channelSetupPlanStep({
            id: 'channel-routing',
            label: 'Read channel routing',
            kind: 'read',
            crPath: 'xd.xenesis.channels.routing.status',
            args: channelArgs,
            expectedState: `${item.label} route binding, default agent, session scope, and delivery diagnostics are visible.`,
            verifyWith: item.channelTemplate.routing.diagnostics,
            safetyBoundary: 'channel routing reads do not mutate channel settings or deliver messages',
          }),
        ]
      : []),
    ...(item.channelTemplate?.safety
      ? [
          channelSetupPlanStep({
            id: 'channel-safety',
            label: 'Read channel safety',
            kind: 'read',
            crPath: 'xd.xenesis.channels.safety.status',
            args: channelArgs,
            expectedState: `${item.label} inbound, outbound, approval, and loop-protection guardrails are visible.`,
            verifyWith: [...item.channelTemplate.safety.troubleshooting, ...item.channelTemplate.safety.loopProtection],
            safetyBoundary: 'channel safety reads do not relax access controls or approval guardrails',
          }),
        ]
      : []),
    ...(item.channelTemplate?.accessGroups
      ? [
          channelSetupPlanStep({
            id: 'channel-access-groups',
            label: 'Read channel access groups',
            kind: 'read',
            crPath: 'xd.xenesis.channels.accessGroups.status',
            args: channelArgs,
            expectedState: `${item.label} allowlist fields, fail-closed bindings, and empty diagnostics are visible.`,
            verifyWith: [
              ...item.channelTemplate.accessGroups.diagnostics,
              ...item.channelTemplate.accessGroups.bindings.map((binding) => binding.emptyDiagnostic),
            ],
            safetyBoundary: 'access-group reads do not add, remove, or expose allowlist entries',
          }),
        ]
      : []),
    ...(item.channelTemplate?.pairing
      ? [
          channelSetupPlanStep({
            id: 'channel-pairing',
            label: 'Read channel pairing',
            kind: 'read',
            crPath: 'xd.xenesis.channels.pairing.status',
            args: channelArgs,
            expectedState: `${item.label} credential refs, pairing model, and pairing state are visible before runtime use.`,
            verifyWith: [...item.channelTemplate.pairing.validationChecks, ...item.channelTemplate.pairing.diagnostics],
            safetyBoundary: 'pairing reads do not pair devices, create subscriptions, or store credentials',
          }),
        ]
      : []),
    ...(item.channelTemplate?.userStory
      ? [
          channelSetupPlanStep({
            id: 'channel-user-stories',
            label: 'Read channel user stories',
            kind: 'read',
            crPath: 'xd.xenesis.channels.userStories.status',
            args: idArgs,
            expectedState: `${item.label} remote-prompt user stories and prerequisite setup are visible before use.`,
            verifyWith: item.channelTemplate.userStory.diagnostics,
            safetyBoundary: 'channel user-story reads do not execute workflows or send messages',
          }),
        ]
      : []),
    ...(item.channelProfileDraft
      ? [
          channelSetupPlanStep({
            id: 'channel-profile-draft',
            label: 'Review channel profile draft',
            kind: 'request',
            crPath: 'xd.xenesis.channels.profileDrafts.request',
            args: channelArgs,
            expectedState: `${item.label} channel profile draft can be reviewed before any profile mutation.`,
            verifyWith: item.channelProfileDraft.diagnostics,
            safetyBoundary: 'channel profile draft review records local Action Inbox items only',
          }),
        ]
      : []),
    ...(item.channelProfileDraft?.controlPaths.includes('xd.xenesis.channels.profileDrafts.apply')
      ? [
          channelSetupPlanStep({
            id: 'channel-profile-apply',
            label: 'Apply channel profile draft',
            kind: 'apply',
            crPath: 'xd.xenesis.channels.profileDrafts.apply',
            args: channelArgs,
            expectedState: `${item.label} profile settings can be applied only through approval-gated profile draft apply.`,
            verifyWith: item.channelProfileDraft.reviewSteps.flatMap((step) => step.diagnostics),
            safetyBoundary: 'profile apply mutates channel settings only after Capability Registry approval',
          }),
        ]
      : []),
    ...(item.messengerView?.controlPaths.includes('xd.xenesis.profiles.testChannel')
      ? [
          channelSetupPlanStep({
            id: 'channel-test',
            label: 'Send sanitized channel test',
            kind: 'apply',
            crPath: 'xd.xenesis.profiles.testChannel',
            args: channelArgs,
            expectedState: `${item.label} test delivery can run only through the approval-gated profile channel test path.`,
            verifyWith: ['sanitized-test-send', 'test-channel-result', ...item.messengerView.diagnostics],
            safetyBoundary: 'test messages are sent only through the approved profile channel test path',
          }),
        ]
      : []),
    channelSetupPlanStep({
      id: 'diagnostic-runbook',
      label: 'Open diagnostic runbook',
      kind: 'open',
      crPath: 'xd.xenesis.connections.diagnostics.open',
      args: idArgs,
      expectedState: `${item.label} diagnostic runbook can be opened for readback verification.`,
      verifyWith: item.diagnosticRunbook?.diagnostics ?? ['cr-readback'],
      safetyBoundary: 'diagnostic runbooks are read/open planning surfaces',
    }),
    channelSetupPlanStep({
      id: 'setup-request',
      label: 'Request setup review',
      kind: 'request',
      crPath: 'xd.xenesis.connections.setupRequests.request',
      args: idArgs,
      expectedState: `${item.label} setup review can be recorded in Desk Action Inbox before external channel work.`,
      verifyWith: item.setupRequest?.diagnostics ?? ['action-inbox-review'],
      safetyBoundary: 'setup request review records local Action Inbox items only',
    }),
  ];
}

function buildXenesisChannelSetupPlan(
  item: XenesisConnectionItem,
): XenesisConnectionChannelSetupPlanTemplate | undefined {
  if (item.kind !== 'messenger') return undefined;
  const steps = channelSetupPlanSteps(item);
  const plannedAdapter = channelSetupPlanRuntimeSupport(item) === 'planned-adapter';
  return {
    planStatus: diagnosticRunbookReadiness(item.status),
    runtimeSupport: plannedAdapter ? 'planned-adapter' : 'implemented',
    guideId: 'openclaw-channel-setup',
    guidePath: 'docs/manual/10-openclaw-channel-setup.md',
    primarySurface: item.messengerView?.primarySurface ?? 'Settings > Xenesis Agent > Connections',
    setupSurface:
      item.messengerView?.setupSurface ??
      item.channelProfileDraft?.setupSurface ??
      item.channelTemplate?.pairing?.setupSurface ??
      'Settings > Xenesis Agent > External bots',
    reviewSurface: 'Desk Action Inbox',
    steps,
    readPaths: uniqueStrings([
      'xd.xenesis.channels.setupPlans.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.guides.status',
      'xd.xenesis.connections.diagnostics.status',
      'xd.xenesis.connections.setupRequests.status',
      'xd.xenesis.messengers.views.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.channels.safety.status',
      'xd.xenesis.channels.accessGroups.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.channels.userStories.status',
      'xd.xenesis.channels.profileDrafts.status',
      ...(item.messengerView?.readPaths ?? []),
      ...(item.channelTemplate?.safety?.readPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.readPaths ?? []),
      ...(item.channelTemplate?.pairing?.readPaths ?? []),
      ...(item.channelTemplate?.userStory?.readPaths ?? []),
      ...(item.channelProfileDraft?.readPaths ?? []),
      ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.readPaths) ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.channels.setupPlans.open',
      'xd.xenesis.connections.open',
      'xd.xenesis.guides.open',
      'xd.xenesis.connections.diagnostics.open',
      'xd.xenesis.connections.setupRequests.request',
      ...(item.messengerView?.controlPaths ?? []),
      ...(item.channelTemplate?.safety?.controlPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.controlPaths ?? []),
      ...(item.channelTemplate?.pairing?.controlPaths ?? []),
      ...(item.channelTemplate?.userStory?.controlPaths ?? []),
      ...(item.channelProfileDraft?.controlPaths ?? []),
      ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.controlPaths) ?? []),
    ]),
    diagnostics: uniqueStrings([
      'channel-setup-plan',
      ...(plannedAdapter ? ['planned-channel-adapter'] : ['implemented-channel-adapter']),
      ...(item.messengerView?.diagnostics ?? []),
      ...(item.channelTemplate?.routing?.diagnostics ?? []),
      ...(item.channelTemplate?.safety?.troubleshooting ?? []),
      ...(item.channelTemplate?.accessGroups?.diagnostics ?? []),
      ...(item.channelTemplate?.pairing?.validationChecks ?? []),
      ...(item.channelTemplate?.pairing?.diagnostics ?? []),
      ...(item.channelTemplate?.userStory?.diagnostics ?? []),
      ...(item.channelProfileDraft?.diagnostics ?? []),
      ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.diagnostics) ?? []),
    ]),
    blockedActions: uniqueStrings([
      ...XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS,
      'send messages outside approved profile test path',
      'mutate channel profile outside approved channel profile draft apply path',
      'store channel secrets in Desk settings',
      'pair accounts or devices from setup plan metadata',
      ...(plannedAdapter
        ? [
            'start planned channel gateway adapters',
            'send messages through planned channel adapters',
            'mutate planned channel profiles',
          ]
        : []),
      ...(item.channelProfileDraft?.blockedActions ?? []),
    ]),
    safetyBoundaries: uniqueStrings([
      'channel setup plans are read/open orchestration metadata',
      'setup plans do not start gateway adapters, pair accounts or devices, send messages, store credentials, mutate channel profiles, or bypass approvals',
      'setup plans do not start gateway adapters',
      plannedAdapter
        ? 'planned channel setup plans are review-only until adapters are verified'
        : 'implemented channel setup plans reference only existing approval-gated apply and test paths',
      ...(item.messengerView?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.safetyControls ?? []),
      ...(item.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.pairing?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.userStory?.safetyBoundaries ?? []),
      ...(item.channelSetupPlan?.safetyBoundaries ?? []),
      ...(item.channelSetupPlan?.steps.map((step) => step.safetyBoundary) ?? []),
      ...(item.channelProfileDraft?.safetyBoundaries ?? []),
      ...(item.channelProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
    ]),
  };
}

function withXenesisConnectionChannelSetupPlan(item: XenesisConnectionItem): XenesisConnectionItem {
  const channelSetupPlan = buildXenesisChannelSetupPlan(item);
  if (!channelSetupPlan) return item;
  return { ...item, channelSetupPlan };
}

function withXenesisConnectionChannelSetupPlans(
  sections: XenesisConnectionsStatus['sections'],
): XenesisConnectionsStatus['sections'] {
  return Object.fromEntries(
    Object.entries(sections).map(([id, section]) => [
      id,
      { ...section, items: section.items.map((item) => withXenesisConnectionChannelSetupPlan(item)) },
    ]),
  ) as XenesisConnectionsStatus['sections'];
}

function diagnosticRunbookReadiness(status: XenesisConnectionStatus): XenesisConnectionDiagnosticRunbookReadiness {
  if (status === 'needs-setup') return 'action-required';
  return status;
}

function diagnosticRunbookStep(input: {
  id: string;
  label: string;
  expectedState: string;
  readPaths?: string[];
  controlPaths?: string[];
  diagnostics?: string[];
}): XenesisConnectionDiagnosticRunbookStep {
  return {
    id: input.id,
    label: input.label,
    expectedState: input.expectedState,
    readPaths: uniqueStrings(input.readPaths ?? []),
    controlPaths: uniqueStrings(input.controlPaths ?? []),
    diagnostics: uniqueStrings(input.diagnostics ?? []),
  };
}

function diagnosticRunbookSetupSurface(item: XenesisConnectionItem): string {
  return (
    item.onboardingPlan?.setupSurface ??
    item.providerView?.setupSurface ??
    item.providerProfileDraft?.setupSurface ??
    (item.providerSetup ? 'Settings > AI Provider' : undefined) ??
    item.toolSetup?.setupSurface ??
    item.toolConnector?.setupSurface ??
    item.toolOAuthDraft?.authSurface ??
    item.toolView?.setupSurface ??
    item.toolActionCatalog?.primarySurface ??
    item.toolUserStory?.setupSurface ??
    item.toolInstallPlan?.setupSurface ??
    item.mcpInstallDraft?.installSurface ??
    item.channelProfileDraft?.setupSurface ??
    item.messengerView?.setupSurface ??
    item.channelTemplate?.pairing?.setupSurface ??
    item.channelTemplate?.userStory?.setupSurface ??
    item.guideCatalog?.primarySurface ??
    item.settingsTarget ??
    'Settings > Xenesis Agent > Connections'
  );
}

function diagnosticRunbookPrimarySurface(item: XenesisConnectionItem): string {
  return (
    item.onboardingPlan?.primarySurface ??
    item.providerView?.primarySurface ??
    (item.providerProfileDraft ? 'Settings > Xenesis Agent > Connections' : undefined) ??
    item.toolView?.primarySurface ??
    (item.toolOAuthDraft ? 'Settings > Xenesis Agent > Connections' : undefined) ??
    item.toolActionCatalog?.primarySurface ??
    item.toolUserStory?.primarySurface ??
    item.toolInstallPlan?.primarySurface ??
    (item.mcpInstallDraft ? 'Settings > Xenesis Agent > Connections' : undefined) ??
    (item.channelProfileDraft ? 'Settings > Xenesis Agent > Connections' : undefined) ??
    item.messengerView?.primarySurface ??
    item.guideCatalog?.primarySurface ??
    'Settings > Xenesis Agent > Connections'
  );
}

function buildXenesisConnectionDiagnosticRunbook(
  item: XenesisConnectionItem,
): XenesisConnectionDiagnosticRunbookTemplate {
  const steps: XenesisConnectionDiagnosticRunbookStep[] = [
    diagnosticRunbookStep({
      id: 'connection-status',
      label: 'Connection status',
      expectedState:
        'Connection Center reports an explicit ready, actionable, planned, disabled, blocked, or unknown state.',
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.connections.diagnostics.open', 'xd.xenesis.connections.open'],
      diagnostics: ['connection-status', item.status, ...(item.missingEnv ?? []), ...(item.warnings ?? [])],
    }),
  ];

  if (item.onboardingPlan) {
    steps.push(
      diagnosticRunbookStep({
        id: 'onboarding-plan',
        label: 'Onboarding plan',
        expectedState: `Validation checks are reviewed: ${item.onboardingPlan.validationChecks.join(', ') || 'none'}.`,
        readPaths: [
          'xd.xenesis.onboarding.status',
          ...item.onboardingPlan.statusReadPaths,
          ...onboardingGuidedStepPaths(item.onboardingPlan, ['read']),
        ],
        controlPaths: [
          ...item.onboardingPlan.controlPaths,
          ...onboardingGuidedStepPaths(item.onboardingPlan, ['open', 'control']),
        ],
        diagnostics: uniqueStrings([
          ...item.onboardingPlan.validationChecks,
          ...item.onboardingPlan.diagnostics,
          ...item.onboardingPlan.guidedSteps.flatMap((step) => step.verifyWith),
        ]),
      }),
    );
  }

  if (item.providerSetup) {
    steps.push(
      diagnosticRunbookStep({
        id: 'provider-setup',
        label: 'Provider setup',
        expectedState: 'Provider credentials, model, runtime profile, fallback policy, and retry policy are visible.',
        readPaths: ['xd.xenesis.providers.setup.status', ...item.providerSetup.crReadPaths],
        controlPaths: item.crActions,
        diagnostics: [...item.providerSetup.verification, ...item.providerSetup.riskControls],
      }),
    );
  }

  if (item.providerRouting) {
    steps.push(
      diagnosticRunbookStep({
        id: 'provider-routing',
        label: 'Provider routing',
        expectedState: 'The active provider route and fallback chain are visible without exposing credentials.',
        readPaths: ['xd.xenesis.providers.routing.status', ...item.providerRouting.readPaths],
        diagnostics: [
          ...item.providerRouting.diagnostics,
          ...item.providerRouting.safetyBoundaries,
          ...item.providerRouting.credentialPools.map((pool) => pool.apiKeyEnv),
        ],
      }),
    );
  }

  if (item.providerView) {
    steps.push(
      diagnosticRunbookStep({
        id: 'provider-view',
        label: 'Provider view',
        expectedState: 'The provider detail view can open the same card and read its supporting metadata.',
        readPaths: ['xd.xenesis.providers.views.status', ...item.providerView.readPaths],
        controlPaths: item.providerView.controlPaths,
        diagnostics: item.providerView.diagnostics,
      }),
    );
  }

  if (item.providerProfileDraft) {
    steps.push(
      diagnosticRunbookStep({
        id: 'provider-profile-draft',
        label: 'Provider profile draft',
        expectedState:
          'Review-only provider profile fields and guardrails are visible before any provider setting mutation.',
        readPaths: [
          'xd.xenesis.providers.profileDrafts.status',
          ...item.providerProfileDraft.readPaths,
          ...item.providerProfileDraft.reviewSteps.flatMap((step) => step.readPaths),
        ],
        controlPaths: [
          ...item.providerProfileDraft.controlPaths,
          ...item.providerProfileDraft.reviewSteps.flatMap((step) => step.controlPaths),
        ],
        diagnostics: [
          ...item.providerProfileDraft.missingRequiredFields,
          ...item.providerProfileDraft.diagnostics,
          ...item.providerProfileDraft.reviewSteps.flatMap((step) => step.diagnostics),
        ],
      }),
    );
  }

  if (item.providerSetupPlan) {
    steps.push(
      diagnosticRunbookStep({
        id: 'provider-setup-plan',
        label: 'Provider setup plan',
        expectedState: 'AI provider setup plan steps, readbacks, and approval-gated boundaries are visible.',
        readPaths: ['xd.xenesis.providers.setupPlans.status', ...item.providerSetupPlan.readPaths],
        controlPaths: item.providerSetupPlan.controlPaths,
        diagnostics: [
          ...item.providerSetupPlan.diagnostics,
          ...item.providerSetupPlan.steps.flatMap((step) => step.verifyWith),
        ],
      }),
    );
  }

  if (item.toolSetup) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-setup',
        label: 'Tool setup',
        expectedState: 'Tool setup scopes, credential storage, and verification checks are visible.',
        readPaths: ['xd.xenesis.tools.setup.status', ...item.toolSetup.crReadPaths],
        controlPaths: item.crActions,
        diagnostics: [...item.toolSetup.verification, ...item.toolSetup.riskControls],
      }),
    );
  }

  if (item.toolConnector) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-connector',
        label: 'Tool connector',
        expectedState: 'Connector runtime support, auth mode, and credential state are visible.',
        readPaths: ['xd.xenesis.tools.connectors.status', ...item.toolConnector.readPaths],
        controlPaths: item.toolConnector.controlPaths,
        diagnostics: [...item.toolConnector.validationChecks, ...item.toolConnector.diagnostics],
      }),
    );
  }

  if (item.toolOAuthDraft) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-oauth-draft',
        label: 'Tool OAuth draft',
        expectedState:
          'Review-only OAuth app, scope, consent, and token-store fields are visible before any OAuth flow or provider tool execution.',
        readPaths: [
          'xd.xenesis.tools.oauthDrafts.status',
          ...item.toolOAuthDraft.readPaths,
          ...item.toolOAuthDraft.reviewSteps.flatMap((step) => step.readPaths),
        ],
        controlPaths: [
          ...item.toolOAuthDraft.controlPaths,
          ...item.toolOAuthDraft.reviewSteps.flatMap((step) => step.controlPaths),
        ],
        diagnostics: [
          ...item.toolOAuthDraft.missingRequiredFields,
          ...item.toolOAuthDraft.scopes,
          ...item.toolOAuthDraft.diagnostics,
          ...item.toolOAuthDraft.reviewSteps.flatMap((step) => step.diagnostics),
        ],
      }),
    );
  }

  if (item.toolView) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-view',
        label: 'Tool view',
        expectedState: 'The internal tool detail view can open and read this connection card.',
        readPaths: ['xd.xenesis.tools.views.status', ...item.toolView.readPaths],
        controlPaths: item.toolView.controlPaths,
        diagnostics: item.toolView.diagnostics,
      }),
    );
  }

  if (item.toolActionCatalog) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-action-catalog',
        label: 'Tool action catalog',
        expectedState:
          'External tool search, read, and write action policies are visible before any provider tool execution.',
        readPaths: ['xd.xenesis.tools.actions.status', ...item.toolActionCatalog.readPaths],
        controlPaths: item.toolActionCatalog.controlPaths,
        diagnostics: [
          ...item.toolActionCatalog.diagnostics,
          ...item.toolActionCatalog.groups.flatMap((group) => [
            group.kind,
            group.approvalPolicy,
            ...group.actions.map((action) => action.label),
          ]),
        ],
      }),
    );
  }

  if (item.toolUserStory) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-user-story',
        label: 'Tool user story',
        expectedState: 'Tool-backed user stories and their prerequisite connectors are visible.',
        readPaths: ['xd.xenesis.tools.userStories.status', ...item.toolUserStory.readPaths],
        controlPaths: item.toolUserStory.controlPaths,
        diagnostics: item.toolUserStory.diagnostics,
      }),
    );
  }

  if (item.toolInstallPlan) {
    steps.push(
      diagnosticRunbookStep({
        id: 'tool-install-plan',
        label: 'Tool install plan',
        expectedState: 'Install mode, setup surfaces, config targets, and manual verification checks are visible.',
        readPaths: ['xd.xenesis.tools.installPlans.status', ...item.toolInstallPlan.readPaths],
        controlPaths: item.toolInstallPlan.controlPaths,
        diagnostics: [...item.toolInstallPlan.installSteps, ...item.toolInstallPlan.diagnostics],
      }),
    );
  }

  if (item.mcpInstallDraft) {
    steps.push(
      diagnosticRunbookStep({
        id: 'mcp-install-draft',
        label: 'MCP install draft',
        expectedState:
          'Review-only MCP install draft metadata is visible before any config write or provider tool use.',
        readPaths: ['xd.xenesis.tools.mcpInstallDrafts.status', ...item.mcpInstallDraft.readPaths],
        controlPaths: item.mcpInstallDraft.controlPaths,
        diagnostics: [...item.mcpInstallDraft.installSteps, ...item.mcpInstallDraft.diagnostics],
      }),
    );
  }

  if (item.channelTemplate?.routing) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-routing',
        label: 'Channel routing',
        expectedState: 'External messenger route binding, pairing mode, and delivery features are visible.',
        readPaths: ['xd.xenesis.channels.routing.status'],
        diagnostics: [...item.channelTemplate.routing.diagnostics, ...item.channelTemplate.routing.deliveryFeatures],
      }),
    );
  }

  if (item.channelTemplate?.safety) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-safety',
        label: 'Channel safety',
        expectedState: 'Inbound, outbound, approval, and loop-protection guardrails are visible.',
        readPaths: ['xd.xenesis.channels.safety.status', ...item.channelTemplate.safety.readPaths],
        controlPaths: item.channelTemplate.safety.controlPaths,
        diagnostics: item.channelTemplate.safety.troubleshooting,
      }),
    );
  }

  if (item.channelTemplate?.accessGroups) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-access-groups',
        label: 'Channel access groups',
        expectedState: 'Allowlist fields, fail-closed bindings, and empty diagnostics are visible.',
        readPaths: ['xd.xenesis.channels.accessGroups.status', ...item.channelTemplate.accessGroups.readPaths],
        controlPaths: item.channelTemplate.accessGroups.controlPaths,
        diagnostics: [
          ...item.channelTemplate.accessGroups.diagnostics,
          ...item.channelTemplate.accessGroups.bindings.map((binding) => binding.emptyDiagnostic),
        ],
      }),
    );
  }

  if (item.channelTemplate?.pairing) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-pairing',
        label: 'Channel pairing',
        expectedState: 'Credential refs, pairing model, and pairing state are visible before any send path is used.',
        readPaths: ['xd.xenesis.channels.pairing.status', ...item.channelTemplate.pairing.readPaths],
        controlPaths: item.channelTemplate.pairing.controlPaths,
        diagnostics: [...item.channelTemplate.pairing.validationChecks, ...item.channelTemplate.pairing.diagnostics],
      }),
    );
  }

  if (item.channelTemplate?.userStory) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-user-story',
        label: 'Channel user story',
        expectedState: 'Remote prompt user stories and prerequisite setup are visible.',
        readPaths: ['xd.xenesis.channels.userStories.status', ...item.channelTemplate.userStory.readPaths],
        controlPaths: item.channelTemplate.userStory.controlPaths,
        diagnostics: item.channelTemplate.userStory.diagnostics,
      }),
    );
  }

  if (item.channelProfileDraft) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-profile-draft',
        label: 'Channel profile draft',
        expectedState:
          'Review-only channel profile fields and guardrails are visible before any updateChannels mutation.',
        readPaths: [
          'xd.xenesis.channels.profileDrafts.status',
          ...item.channelProfileDraft.readPaths,
          ...item.channelProfileDraft.reviewSteps.flatMap((step) => step.readPaths),
        ],
        controlPaths: [
          ...item.channelProfileDraft.controlPaths,
          ...item.channelProfileDraft.reviewSteps.flatMap((step) => step.controlPaths),
        ],
        diagnostics: [
          ...item.channelProfileDraft.missingRequiredFields,
          ...item.channelProfileDraft.diagnostics,
          ...item.channelProfileDraft.reviewSteps.flatMap((step) => step.diagnostics),
        ],
      }),
    );
  }

  if (item.channelSetupPlan) {
    steps.push(
      diagnosticRunbookStep({
        id: 'channel-setup-plan',
        label: 'Channel setup plan',
        expectedState: 'Messenger/channel setup plan steps, readbacks, and approval-gated boundaries are visible.',
        readPaths: ['xd.xenesis.channels.setupPlans.status', ...item.channelSetupPlan.readPaths],
        controlPaths: item.channelSetupPlan.controlPaths,
        diagnostics: [
          ...item.channelSetupPlan.diagnostics,
          ...item.channelSetupPlan.steps.flatMap((step) => step.verifyWith),
        ],
      }),
    );
  }

  if (item.messengerView) {
    steps.push(
      diagnosticRunbookStep({
        id: 'messenger-view',
        label: 'Messenger view',
        expectedState: 'The internal messenger detail view can open and read this connection card.',
        readPaths: ['xd.xenesis.messengers.views.status', ...item.messengerView.readPaths],
        controlPaths: item.messengerView.controlPaths,
        diagnostics: item.messengerView.diagnostics,
      }),
    );
  }

  if (item.guideCatalog) {
    steps.push(
      diagnosticRunbookStep({
        id: 'guide-catalog',
        label: 'Guide catalog',
        expectedState: 'The guide card exposes audience, covered surfaces, prerequisites, and validation checks.',
        readPaths: ['xd.xenesis.guides.status', ...item.guideCatalog.readPaths, ...(item.guideFile?.readPaths ?? [])],
        controlPaths: [...item.guideCatalog.controlPaths, ...(item.guideFile?.controlPaths ?? [])],
        diagnostics: [
          ...item.guideCatalog.validationChecks,
          ...item.guideCatalog.userStoryTemplates,
          ...(item.guideFile?.diagnostics ?? []),
        ],
      }),
    );
  }

  return {
    scope: item.kind,
    readiness: diagnosticRunbookReadiness(item.status),
    primarySurface: diagnosticRunbookPrimarySurface(item),
    setupSurface: diagnosticRunbookSetupSurface(item),
    steps,
    readPaths: uniqueStrings(['xd.xenesis.connections.diagnostics.status', ...steps.flatMap((step) => step.readPaths)]),
    controlPaths: uniqueStrings([
      'xd.xenesis.connections.diagnostics.open',
      ...steps.flatMap((step) => step.controlPaths),
    ]),
    diagnostics: uniqueStrings(steps.flatMap((step) => step.diagnostics)),
    safetyBoundaries: uniqueStrings([
      'diagnostic runbooks are read/open planning surfaces',
      'diagnostic runbooks do not execute tools, send messages, complete OAuth, install adapters, or mutate settings',
      ...(item.onboardingPlan?.safetyBoundaries ?? []),
      ...(item.onboardingPlan?.guidedSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.safetyBoundaries ?? []),
      ...(item.providerView?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.providerSetupPlan?.safetyBoundaries ?? []),
      ...(item.toolSetup?.riskControls ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.toolView?.safetyBoundaries ?? []),
      ...(item.toolActionCatalog?.safetyBoundaries ?? []),
      ...(item.toolUserStory?.safetyBoundaries ?? []),
      ...(item.toolInstallPlan?.safetyBoundaries ?? []),
      ...(item.mcpInstallDraft?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.safetyControls ?? []),
      ...(item.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.pairing?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.userStory?.safetyBoundaries ?? []),
      ...(item.channelProfileDraft?.safetyBoundaries ?? []),
      ...(item.channelProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.messengerView?.safetyBoundaries ?? []),
      ...(item.guideCatalog?.safetyBoundaries ?? []),
      ...(item.guideFile?.safetyBoundaries ?? []),
    ]),
  };
}

function withXenesisConnectionDiagnosticRunbook(item: XenesisConnectionItem): XenesisConnectionItem {
  return {
    ...item,
    diagnosticRunbook: buildXenesisConnectionDiagnosticRunbook(item),
  };
}

function withXenesisConnectionDiagnosticRunbooks(
  sections: XenesisConnectionsStatus['sections'],
): XenesisConnectionsStatus['sections'] {
  return Object.fromEntries(
    Object.entries(sections).map(([id, section]) => [
      id,
      { ...section, items: section.items.map((item) => withXenesisConnectionDiagnosticRunbook(item)) },
    ]),
  ) as XenesisConnectionsStatus['sections'];
}

function xenesisConnectionSetupRequestType(item: XenesisConnectionItem): XenesisConnectionSetupRequestType {
  if (item.kind === 'onboarding') return 'onboarding-step';
  if (item.kind === 'provider') return 'provider-setup';
  if (item.kind === 'local-cli') return 'local-cli-setup';
  if (item.kind === 'mcp') return 'mcp-setup';
  if (item.kind === 'gateway') return 'gateway-setup';
  if (item.kind === 'messenger') return 'messenger-setup';
  if (item.kind === 'guide') return 'guide-review';
  return 'tool-setup';
}

function setupRequestDiagnosticItems(item: XenesisConnectionItem): string[] {
  return uniqueStrings([
    ...(item.diagnosticRunbook?.diagnostics ?? []),
    ...(item.missingEnv ?? []),
    ...(item.warnings ?? []),
    ...(item.onboardingPlan?.diagnostics ?? []),
    ...(item.onboardingPlan?.guidedSteps.flatMap((step) => step.verifyWith) ?? []),
    ...(item.providerSetup?.verification ?? []),
    ...(item.providerRouting?.diagnostics ?? []),
    ...(item.providerProfileDraft?.diagnostics ?? []),
    ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.diagnostics) ?? []),
    ...(item.providerSetupPlan?.diagnostics ?? []),
    ...(item.providerSetupPlan?.steps.flatMap((step) => step.verifyWith) ?? []),
    ...(item.toolSetup?.verification ?? []),
    ...(item.toolConnector?.validationChecks ?? []),
    ...(item.toolOAuthDraft?.diagnostics ?? []),
    ...(item.toolOAuthDraft?.reviewSteps.flatMap((step) => step.diagnostics) ?? []),
    ...(item.toolActionCatalog?.diagnostics ?? []),
    ...(item.toolSetupPlan?.diagnostics ?? []),
    ...(item.toolInstallPlan?.diagnostics ?? []),
    ...(item.mcpInstallDraft?.diagnostics ?? []),
    ...(item.channelTemplate?.routing?.diagnostics ?? []),
    ...(item.channelTemplate?.safety?.troubleshooting ?? []),
    ...(item.channelTemplate?.accessGroups?.diagnostics ?? []),
    ...(item.channelTemplate?.pairing?.validationChecks ?? []),
    ...(item.channelTemplate?.userStory?.diagnostics ?? []),
    ...(item.channelSetupPlan?.diagnostics ?? []),
    ...(item.channelProfileDraft?.diagnostics ?? []),
    ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.diagnostics) ?? []),
    ...(item.guideCatalog?.validationChecks ?? []),
  ]);
}

function setupRequestStepItems(item: XenesisConnectionItem): string[] {
  return uniqueStrings([
    ...(item.setupSteps ?? []),
    ...(item.onboardingPlan?.guidedSteps.map((step) => `${step.kind} ${step.crPath}: ${step.expectedState}`) ?? []),
    ...(item.onboardingPlan?.validationChecks.map((check) => `verify ${check}`) ?? []),
    ...(item.providerSetup?.verification.map((check) => `verify ${check}`) ?? []),
    ...(item.providerProfileDraft?.missingRequiredFields.map((field) => `review provider profile field: ${field}`) ??
      []),
    ...(item.providerProfileDraft?.reviewSteps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.providerSetupPlan?.steps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.toolOAuthDraft?.missingRequiredFields.map((field) => `review OAuth draft field: ${field}`) ?? []),
    ...(item.toolOAuthDraft?.scopes.map((scope) => `review OAuth scope: ${scope}`) ?? []),
    ...(item.toolOAuthDraft?.reviewSteps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.toolSetupPlan?.steps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.toolInstallPlan?.installSteps ?? []),
    ...(item.mcpInstallDraft?.installSteps ?? []),
    ...(item.toolConnector?.validationChecks.map((check) => `validate ${check}`) ?? []),
    ...(item.toolSetup?.verification.map((check) => `verify ${check}`) ?? []),
    ...(item.channelTemplate?.pairing?.validationChecks.map((check) => `validate ${check}`) ?? []),
    ...(item.channelTemplate?.accessGroups?.bindings.map(
      (binding) => `review ${binding.field}: ${binding.description}`,
    ) ?? []),
    ...(item.channelTemplate?.userStory?.prerequisiteSetup.map((check) => `verify ${check}`) ?? []),
    ...(item.channelSetupPlan?.steps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.channelProfileDraft?.missingRequiredFields.map((field) => `review channel profile field: ${field}`) ?? []),
    ...(item.channelProfileDraft?.reviewSteps.map((step) => `${step.id}: ${step.expectedState}`) ?? []),
    ...(item.guideCatalog?.prerequisites.map((check) => `review prerequisite: ${check}`) ?? []),
    ...(item.guideCatalog?.validationChecks.map((check) => `validate ${check}`) ?? []),
    item.summary,
  ]);
}

function setupRequestDescription(item: XenesisConnectionItem): string {
  const plannedOAuth =
    item.toolInstallPlan?.runtimeSupport === 'planned-oauth' ||
    item.toolInstallPlan?.installMode === 'planned-oauth' ||
    item.toolConnector?.runtimeSupport === 'planned-oauth' ||
    item.toolSetup?.authMode === 'oauth';
  if (plannedOAuth) {
    return `Review the planned OAuth setup request for ${item.label} before any adapter, credential, or OAuth flow exists.`;
  }
  return `Review the setup request for ${item.label} from the Connection Center before any external work is performed.`;
}

function setupRequestApplyDelegatePaths(item: XenesisConnectionItem): string[] {
  return uniqueStrings([
    ...(item.mcpInstallDraft?.draftStatus === 'ready' &&
    item.mcpInstallDraft.controlPaths.includes('xd.xenesis.tools.mcpInstallDrafts.apply')
      ? ['xd.xenesis.tools.mcpInstallDrafts.apply']
      : []),
    ...(item.channelProfileDraft?.controlPaths.includes('xd.xenesis.channels.profileDrafts.apply')
      ? ['xd.xenesis.channels.profileDrafts.apply']
      : []),
    ...(item.providerProfileDraft?.controlPaths.includes('xd.xenesis.providers.profileDrafts.apply')
      ? ['xd.xenesis.providers.profileDrafts.apply']
      : []),
  ]);
}

function buildXenesisConnectionSetupRequest(item: XenesisConnectionItem): XenesisConnectionSetupRequestTemplate {
  const diagnostics = setupRequestDiagnosticItems(item);
  const steps = setupRequestStepItems(item);
  const applyDelegatePaths = setupRequestApplyDelegatePaths(item);
  return {
    requestType: xenesisConnectionSetupRequestType(item),
    actionInboxKind: 'xenesis-connection-setup',
    readiness: item.diagnosticRunbook?.readiness ?? diagnosticRunbookReadiness(item.status),
    title: `Review ${item.label} setup request`,
    description: setupRequestDescription(item),
    setupSurface: item.diagnosticRunbook?.setupSurface ?? diagnosticRunbookSetupSurface(item),
    reviewSurface: 'Desk Action Inbox',
    steps,
    readPaths: uniqueStrings([
      'xd.xenesis.connections.setupRequests.status',
      'xd.xenesis.connections.diagnostics.status',
      ...(item.diagnosticRunbook?.readPaths ?? []),
      ...(item.onboardingPlan?.statusReadPaths ?? []),
      ...onboardingGuidedStepPaths(item.onboardingPlan, ['read']),
      ...(item.providerSetup?.crReadPaths ?? []),
      ...(item.providerRouting?.readPaths ?? []),
      ...(item.providerView?.readPaths ?? []),
      ...(item.providerProfileDraft?.readPaths ?? []),
      ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.readPaths) ?? []),
      ...(item.providerSetupPlan?.readPaths ?? []),
      ...(item.toolSetup?.crReadPaths ?? []),
      ...(item.toolConnector?.readPaths ?? []),
      ...(item.toolOAuthDraft?.readPaths ?? []),
      ...(item.toolOAuthDraft?.reviewSteps.flatMap((step) => step.readPaths) ?? []),
      ...(item.toolSetupPlan?.readPaths ?? []),
      ...(item.toolView?.readPaths ?? []),
      ...(item.toolUserStory?.readPaths ?? []),
      ...(item.toolInstallPlan?.readPaths ?? []),
      ...(item.mcpInstallDraft?.readPaths ?? []),
      ...(item.channelTemplate?.safety?.readPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.readPaths ?? []),
      ...(item.channelTemplate?.pairing?.readPaths ?? []),
      ...(item.channelTemplate?.userStory?.readPaths ?? []),
      ...(item.channelSetupPlan?.readPaths ?? []),
      ...(item.channelProfileDraft?.readPaths ?? []),
      ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.readPaths) ?? []),
      ...(item.messengerView?.readPaths ?? []),
      ...(item.guideCatalog?.readPaths ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.connections.setupRequests.open',
      'xd.xenesis.connections.setupRequests.request',
      ...(applyDelegatePaths.length > 0 ? ['xd.xenesis.connections.setupRequests.apply'] : []),
      'xd.xenesis.connections.open',
      ...(item.diagnosticRunbook?.controlPaths ?? []),
      ...(item.onboardingPlan?.controlPaths ?? []),
      ...onboardingGuidedStepPaths(item.onboardingPlan, ['open', 'control']),
      ...(item.providerView?.controlPaths ?? []),
      ...(item.providerProfileDraft?.controlPaths ?? []),
      ...(item.providerProfileDraft?.reviewSteps.flatMap((step) => step.controlPaths) ?? []),
      ...(item.providerSetupPlan?.controlPaths ?? []),
      ...(item.crActions ?? []),
      ...(item.toolConnector?.controlPaths ?? []),
      ...(item.toolOAuthDraft?.controlPaths ?? []),
      ...(item.toolOAuthDraft?.reviewSteps.flatMap((step) => step.controlPaths) ?? []),
      ...(item.toolSetupPlan?.controlPaths ?? []),
      ...(item.toolView?.controlPaths ?? []),
      ...(item.toolActionCatalog?.controlPaths ?? []),
      ...(item.toolUserStory?.controlPaths ?? []),
      ...(item.toolInstallPlan?.controlPaths ?? []),
      ...(item.mcpInstallDraft?.controlPaths ?? []),
      ...(item.channelTemplate?.safety?.controlPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.controlPaths ?? []),
      ...(item.channelTemplate?.pairing?.controlPaths ?? []),
      ...(item.channelTemplate?.userStory?.controlPaths ?? []),
      ...(item.channelSetupPlan?.controlPaths ?? []),
      ...(item.channelProfileDraft?.controlPaths ?? []),
      ...(item.channelProfileDraft?.reviewSteps.flatMap((step) => step.controlPaths) ?? []),
      ...(item.messengerView?.controlPaths ?? []),
      ...(item.guideCatalog?.controlPaths ?? []),
    ]),
    diagnostics,
    blockedActions: [...XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS],
    safetyBoundaries: uniqueStrings([
      'setup request review records local Action Inbox items only',
      ...(applyDelegatePaths.length > 0
        ? [
            'setup request apply delegates only to ready approval-gated setup apply paths',
            `setup request apply delegates: ${applyDelegatePaths.join(', ')}`,
          ]
        : [
            'setup requests do not install MCP servers, complete OAuth, store tokens, execute provider tools, mutate settings, or send messages',
          ]),
      ...(item.diagnosticRunbook?.safetyBoundaries ?? []),
      ...(item.onboardingPlan?.safetyBoundaries ?? []),
      ...(item.onboardingPlan?.guidedSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.safetyBoundaries ?? []),
      ...(item.providerView?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.providerSetupPlan?.safetyBoundaries ?? []),
      ...(item.toolSetup?.riskControls ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.toolSetupPlan?.safetyBoundaries ?? []),
      ...(item.toolView?.safetyBoundaries ?? []),
      ...(item.toolActionCatalog?.safetyBoundaries ?? []),
      ...(item.toolUserStory?.safetyBoundaries ?? []),
      ...(item.toolInstallPlan?.safetyBoundaries ?? []),
      ...(item.mcpInstallDraft?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.safetyControls ?? []),
      ...(item.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.pairing?.safetyBoundaries ?? []),
      ...(item.channelTemplate?.userStory?.safetyBoundaries ?? []),
      ...(item.channelSetupPlan?.safetyBoundaries ?? []),
      ...(item.channelProfileDraft?.safetyBoundaries ?? []),
      ...(item.channelProfileDraft?.reviewSteps.map((step) => step.safetyBoundary) ?? []),
      ...(item.messengerView?.safetyBoundaries ?? []),
      ...(item.guideCatalog?.safetyBoundaries ?? []),
    ]),
  };
}

function withXenesisConnectionSetupRequest(item: XenesisConnectionItem): XenesisConnectionItem {
  return {
    ...item,
    setupRequest: buildXenesisConnectionSetupRequest(item),
  };
}

function withXenesisConnectionSetupRequests(
  sections: XenesisConnectionsStatus['sections'],
): XenesisConnectionsStatus['sections'] {
  return Object.fromEntries(
    Object.entries(sections).map(([id, section]) => [
      id,
      { ...section, items: section.items.map((item) => withXenesisConnectionSetupRequest(item)) },
    ]),
  ) as XenesisConnectionsStatus['sections'];
}

const XENESIS_CONNECTION_SETUP_REVIEW_STATUSES: readonly XenesisConnectionSetupRequestReviewStatus[] = [
  'pending',
  'approved',
  'rejected',
  'failed',
  'expired',
];

export function buildXenesisConnectionSetupApprovalSessionKey(id: string): string {
  return `xenesis-connection-setup:${id}`;
}

function normalizeSetupRequestReviewStatus(value?: string): XenesisConnectionSetupRequestReviewStatus {
  const status = typeof value === 'string' ? value.trim() : '';
  return (XENESIS_CONNECTION_SETUP_REVIEW_STATUSES as readonly string[]).includes(status)
    ? (status as XenesisConnectionSetupRequestReviewStatus)
    : 'pending';
}

function setupRequestReviewSortValue(item: XenesisConnectionSetupRequestReviewInput): number {
  const updatedAt = Date.parse(item.updatedAt || '');
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(item.createdAt || '');
  return Number.isFinite(createdAt) ? createdAt : 0;
}

function setupRequestReviewFromInboxItem(
  approvalSessionKey: string,
  item?: XenesisConnectionSetupRequestReviewInput,
): XenesisConnectionSetupRequestReview {
  if (!item) {
    return {
      status: 'not-requested',
      approvalSessionKey,
    };
  }

  return {
    status: normalizeSetupRequestReviewStatus(item.status),
    approvalSessionKey,
    ...(item.id ? { actionInboxItemId: item.id } : {}),
    ...(item.requester ? { requester: item.requester } : {}),
    ...(item.source ? { source: item.source } : {}),
    ...(item.createdAt ? { createdAt: item.createdAt } : {}),
    ...(item.updatedAt ? { updatedAt: item.updatedAt } : {}),
    ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}),
    ...(item.resolvedAt ? { resolvedAt: item.resolvedAt } : {}),
    ...(item.result ? { result: item.result } : {}),
    ...(item.error ? { error: item.error } : {}),
  };
}

export function withXenesisConnectionSetupRequestReviews(
  status: XenesisConnectionsStatus,
  inboxItems: XenesisConnectionSetupRequestReviewInput[],
): XenesisConnectionsStatus {
  const latestByApprovalSessionKey = new Map<string, XenesisConnectionSetupRequestReviewInput>();
  for (const item of inboxItems) {
    const approvalSessionKey = item.approvalSessionKey?.trim();
    if (!approvalSessionKey?.startsWith('xenesis-connection-setup:')) continue;
    if (item.kind && item.kind !== 'xenesis-connection-setup') continue;
    const existing = latestByApprovalSessionKey.get(approvalSessionKey);
    if (!existing || setupRequestReviewSortValue(item) >= setupRequestReviewSortValue(existing)) {
      latestByApprovalSessionKey.set(approvalSessionKey, item);
    }
  }

  const sections = Object.fromEntries(
    Object.entries(status.sections).map(([id, section]) => [
      id,
      {
        ...section,
        items: section.items.map((item) => {
          if (!item.setupRequest) return { ...item };
          const approvalSessionKey = buildXenesisConnectionSetupApprovalSessionKey(item.id);
          return {
            ...item,
            setupRequest: {
              ...item.setupRequest,
              review: setupRequestReviewFromInboxItem(
                approvalSessionKey,
                latestByApprovalSessionKey.get(approvalSessionKey),
              ),
            },
          };
        }),
      },
    ]),
  ) as XenesisConnectionsStatus['sections'];

  return {
    ...status,
    sections,
  };
}

function toolConnectionItems(env: Record<string, string | undefined> = {}): XenesisConnectionItem[] {
  return TOOL_CONNECTIONS.map((item) => {
    const withCredentialState = item.toolConnector
      ? {
          ...item,
          toolConnector: withToolConnectorCredentialState(item.toolConnector, env),
        }
      : item;
    return {
      ...withCredentialState,
      toolOAuthDraft: buildXenesisToolOAuthDraft(withCredentialState),
      mcpInstallDraft: buildXenesisMcpInstallDraft(withCredentialState, env),
    };
  });
}

function readChannelPairingCredentialState(
  ref: XenesisConnectionChannelPairingCredentialRef,
  channelSettings: Record<string, unknown> | undefined,
  env: Record<string, string | undefined>,
): XenesisConnectionChannelPairingState {
  if (ref.state === 'planned') return 'planned';
  if (!ref.required) return 'not-required';
  if (ref.source === 'profile-env-field') {
    if (!channelSettings) return 'unknown';
    const envRef = channelSettings[ref.ref];
    if (typeof envRef !== 'string' || !envRef.trim()) return 'missing';
    return env[envRef.trim()]?.trim() ? 'configured' : 'missing';
  }
  if (ref.source === 'env') return env[ref.ref]?.trim() ? 'configured' : 'missing';
  if (ref.source === 'none') return 'not-required';
  return ref.state;
}

function withChannelPairingCredentialState(
  pairing: XenesisConnectionChannelPairingTemplate,
  channelSettings: Record<string, unknown> | undefined,
  env: Record<string, string | undefined>,
): XenesisConnectionChannelPairingTemplate {
  const credentialRefs = pairing.credentialRefs.map((ref) => ({
    ...ref,
    state: readChannelPairingCredentialState(ref, channelSettings, env),
  }));
  return {
    ...pairing,
    credentialRefs,
    pairingState: aggregateChannelPairingState(credentialRefs, pairing.runtimeSupport),
  };
}

const LOCAL_PROVIDER_NAMES = ['codex-cli', 'codex-app-server', 'claude-cli', 'claude-interactive'] as const;

function isLocalProviderName(provider: string): boolean {
  return (LOCAL_PROVIDER_NAMES as readonly string[]).includes(provider);
}

function providerAuthMode(provider: string): XenesisConnectionProviderSetupTemplate['authMode'] {
  if (provider === 'auto') return 'auto-detect';
  if (isLocalProviderName(provider)) return 'local-login';
  if (provider === 'ollama' || provider === 'lmstudio') return 'none';
  return 'api-key';
}

function providerCredentialStorage(authMode: XenesisConnectionProviderSetupTemplate['authMode']): string {
  if (authMode === 'auto-detect') return 'credential scan: Codex login, Claude login, then env keys';
  if (authMode === 'local-login') return 'local CLI login or app-server session';
  if (authMode === 'none') return 'none';
  return 'AI Provider settings secret field';
}

function providerSetupTemplate(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
): XenesisConnectionProviderSetupTemplate {
  const authMode = providerAuthMode(aiProvider.provider);
  const needsCredential = authMode === 'api-key';
  return {
    source: aiProvider.provider === 'auto' ? 'auto-detect' : 'user-settings',
    provider: aiProvider.provider,
    model: aiProvider.model || 'default',
    authMode,
    credentialState: needsCredential ? (aiProvider.apiKey ? 'configured' : 'missing') : 'not-required',
    credentialStorage: providerCredentialStorage(authMode),
    endpoint: aiProvider.baseUrl || xenesis?.providerRuntime.baseURL || 'default',
    runtimeProfile: xenesis?.providerRuntime.profile || xenesis?.profile.active || '',
    runtimeProvider: xenesis?.providerRuntime.provider || aiProvider.provider,
    runtimeModel: xenesis?.providerRuntime.model || aiProvider.model || 'default',
    providerRetries: xenesis?.profile.policy.providerRetries ?? 0,
    fallbackPolicy: 'configured-providerFallbacks',
    localCliBoundary: 'provider identity is separate from local CLI integration',
    verification: ['normal-chat', 'provider-footer', 'cr-readback'],
    crReadPaths: ['xd.xenesis.connections.status', 'xd.xenesis.providers.setup.status', 'xd.xenesis.status'],
    riskControls: [
      'do not silently switch keyed providers when credentials are missing',
      'keep local CLI selection separate from provider identity',
      'verify live Agent pane provider before Desk-control claims',
    ],
  };
}

function providerCredentialState(
  provider: string,
  apiKeyEnv: string,
  env: Record<string, string | undefined>,
  directSecret = false,
): XenesisConnectionProviderCredentialState {
  const authMode = providerAuthMode(provider);
  if (authMode === 'none' || authMode === 'local-login' || authMode === 'auto-detect') return 'not-required';
  if (directSecret) return 'configured';
  return apiKeyEnv && env[apiKeyEnv] ? 'configured' : 'missing';
}

function providerRoutingTemplate(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
  providerFallbacks: XenesisConnectionProviderFallbackInput[] = [],
  env: Record<string, string | undefined> = {},
): XenesisConnectionProviderRoutingTemplate {
  const activeProvider = aiProvider.provider;
  const activeModel = aiProvider.model || 'default';
  const runtimeProvider = xenesis?.providerRuntime.provider || activeProvider;
  const runtimeModel = xenesis?.providerRuntime.model || activeModel;
  const runtimeProfile = xenesis?.providerRuntime.profile || xenesis?.profile.active || '';
  const runtimeApiKeyEnv = xenesis?.providerRuntime.apiKeyEnv || '';
  const fallbackChain = providerFallbacks.map((fallback, index) => ({
    index: index + 1,
    provider: fallback.provider,
    model: fallback.model || runtimeModel,
    baseURLState: fallback.baseURL ? ('custom' as const) : ('default' as const),
    apiKeyEnv: fallback.apiKeyEnv || '',
    credentialState: providerCredentialState(fallback.provider, fallback.apiKeyEnv || '', env),
  }));

  return {
    routeSource: 'user-settings-profile',
    activeProvider,
    activeModel,
    runtimeProfile,
    runtimeProvider,
    runtimeModel,
    retryPolicy: {
      maxRetries: xenesis?.profile.policy.providerRetries ?? 0,
      source: 'profile.policy.providerRetries',
    },
    fallbackPolicy: 'configured-providerFallbacks',
    fallbackChainSource: 'xenesis-runtime-config',
    fallbackChainVisible: fallbackChain.length > 0,
    fallbackChain,
    credentialPools: [
      {
        provider: runtimeProvider,
        apiKeyEnv: runtimeApiKeyEnv,
        credentialState: providerCredentialState(runtimeProvider, runtimeApiKeyEnv, env, Boolean(aiProvider.apiKey)),
        source: 'runtime',
      },
      ...fallbackChain.map((fallback) => ({
        provider: fallback.provider,
        apiKeyEnv: fallback.apiKeyEnv,
        credentialState: fallback.credentialState,
        source: 'fallback' as const,
      })),
    ],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.status',
    ],
    diagnostics: ['provider-footer', 'work-log-provider', 'provider_retry', 'provider_fallback', 'cr-readback'],
    safetyBoundaries: [
      'routing status is read-only',
      'provider identity comes from user settings and profile',
      'fallback entries expose env names and credential state only, never secret values',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  };
}

function providerViewTemplate(provider: string): XenesisConnectionProviderViewTemplate {
  return {
    viewType: 'provider-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider',
    openPath: 'xd.xenesis.providers.views.open',
    openArgs: { provider },
    connectionCardId: `provider-${provider}`,
    internalViews: ['connection-card', 'provider-setup', 'provider-runtime', 'fallback-policy', 'credential-boundary'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.views.status',
      'xd.xenesis.status',
    ],
    controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open'],
    diagnostics: ['provider-footer', 'work-log-provider', 'credential-state', 'runtime-profile', 'fallback-policy'],
    safetyBoundaries: [
      'provider view opens internal setup/readiness surfaces only',
      'provider identity comes from user settings and profile',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  };
}

function providerUsesDefaultModel(provider: string): boolean {
  return ['auto', 'codex-cli', 'codex-app-server', 'claude-cli', 'claude-interactive', 'ollama', 'lmstudio'].includes(
    provider,
  );
}

function providerProfileDraftValueState(input: {
  required: boolean;
  configured: boolean;
  notRequired?: boolean;
  defaultValue?: boolean;
}): XenesisConnectionProviderProfileDraftFieldValueState {
  if (input.notRequired) return 'not-required';
  if (input.configured) return 'configured';
  if (input.defaultValue) return 'default';
  if (input.required) return 'missing';
  return 'unknown';
}

function providerProfileDraftReviewStep(
  input: XenesisConnectionProviderProfileDraftReviewStep,
): XenesisConnectionProviderProfileDraftReviewStep {
  return {
    ...input,
    requiredFields: uniqueStrings(input.requiredFields),
    readPaths: uniqueStrings(input.readPaths),
    controlPaths: uniqueStrings(input.controlPaths),
    diagnostics: uniqueStrings(input.diagnostics),
  };
}

function providerProfileDraftReviewSteps(input: {
  provider: string;
  credentialField: string;
  modelRequired: boolean;
  credentialRequired: boolean;
  providerSetup: XenesisConnectionProviderSetupTemplate;
  providerRouting: XenesisConnectionProviderRoutingTemplate;
}): XenesisConnectionProviderProfileDraftReviewStep[] {
  const modelCredentialFields = uniqueStrings([
    input.modelRequired ? 'model' : undefined,
    input.credentialRequired ? input.credentialField : undefined,
  ]);
  return [
    providerProfileDraftReviewStep({
      id: 'provider-identity',
      label: 'Review provider identity',
      phase: 'provider-identity',
      expectedState: `${input.provider} provider identity and auth mode are visible before settings changes.`,
      requiredFields: ['provider', 'authMode'],
      readPaths: ['xd.xenesis.providers.profileDrafts.status', 'xd.xenesis.providers.setup.status'],
      controlPaths: ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
      diagnostics: ['provider-identity', 'provider-profile-draft', 'credential-state'],
      safetyBoundary: 'Provider identity review does not change the active provider.',
    }),
    providerProfileDraftReviewStep({
      id: 'model-credential-readiness',
      label: 'Review model and credential readiness',
      phase: 'model-credential-readiness',
      expectedState: `${input.provider} model and credential readiness are visible without returning secrets.`,
      requiredFields: modelCredentialFields,
      readPaths: ['xd.xenesis.providers.profileDrafts.status', 'xd.xenesis.providers.setup.status'],
      controlPaths: ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
      diagnostics: ['model-credential-readiness', ...input.providerSetup.verification, 'credential-state'],
      safetyBoundary: 'Model and credential review does not store credentials, change models, or run provider prompts.',
    }),
    providerProfileDraftReviewStep({
      id: 'runtime-routing',
      label: 'Review runtime routing',
      phase: 'runtime-routing',
      expectedState: `${input.provider} runtime profile, fallback policy, retry policy, and credential pool state are visible.`,
      requiredFields: ['runtimeProfile', 'fallbackPolicy'],
      readPaths: [
        'xd.xenesis.providers.profileDrafts.status',
        'xd.xenesis.providers.routing.status',
        'xd.xenesis.status',
      ],
      controlPaths: ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
      diagnostics: [
        'runtime-routing',
        'fallback-policy',
        ...input.providerRouting.diagnostics,
        ...input.providerRouting.credentialPools.map((pool) => pool.apiKeyEnv),
      ],
      safetyBoundary: 'Runtime routing review does not edit fallback chains, retries, or credential pools.',
    }),
    providerProfileDraftReviewStep({
      id: 'local-cli-boundary',
      label: 'Review local CLI boundary',
      phase: 'local-cli-boundary',
      expectedState: `${input.provider} provider identity remains separate from installed local CLI selection.`,
      requiredFields: ['localCliBoundary'],
      readPaths: ['xd.xenesis.providers.profileDrafts.status', 'xd.xenesis.providers.setup.status'],
      controlPaths: ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
      diagnostics: ['local-cli-boundary', input.providerSetup.localCliBoundary],
      safetyBoundary: 'Local CLI boundary review does not switch local CLI selection or rewrite CLI config.',
    }),
  ];
}

function providerProfileDraftTemplate(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
  providerSetup: XenesisConnectionProviderSetupTemplate,
  providerRouting: XenesisConnectionProviderRoutingTemplate,
): XenesisConnectionProviderProfileDraftTemplate {
  const provider = aiProvider.provider.trim();
  const authMode = providerSetup.authMode;
  const modelRequired = !providerUsesDefaultModel(provider);
  const modelConfigured = Boolean(aiProvider.model.trim());
  const credentialRequired = authMode === 'api-key';
  const credentialConfigured = Boolean(aiProvider.apiKey);
  const credentialField = credentialRequired ? 'apiKey' : 'credential';
  const profileFields: XenesisConnectionProviderProfileDraftField[] = [
    {
      field: 'provider',
      label: 'Provider',
      required: true,
      secretRef: false,
      valueState: providerProfileDraftValueState({
        required: true,
        configured: Boolean(provider),
      }),
      source: 'AI Provider settings provider field',
      description: 'Active reasoning provider identity selected by the user settings profile.',
    },
    {
      field: 'model',
      label: 'Model',
      required: modelRequired,
      secretRef: false,
      valueState: providerProfileDraftValueState({
        required: modelRequired,
        configured: modelConfigured,
        notRequired: !modelRequired,
      }),
      source: 'AI Provider settings model field',
      description: 'Model name used by the selected provider when that provider requires an explicit model.',
    },
    {
      field: 'authMode',
      label: 'Auth mode',
      required: true,
      secretRef: false,
      valueState: providerProfileDraftValueState({
        required: true,
        configured: Boolean(authMode),
      }),
      source: 'provider auth policy',
      description: 'Credential mode derived from the provider identity.',
    },
    {
      field: credentialField,
      label: credentialRequired ? 'API key' : 'Credential',
      required: credentialRequired,
      secretRef: credentialRequired,
      valueState: providerProfileDraftValueState({
        required: credentialRequired,
        configured: credentialConfigured,
        notRequired: !credentialRequired,
      }),
      source: providerSetup.credentialStorage,
      description: credentialRequired
        ? `${provider} API key secret state.`
        : 'Credential state is represented as a non-secret readiness value.',
    },
    {
      field: 'endpoint',
      label: 'Endpoint',
      required: false,
      secretRef: false,
      valueState: providerSetup.endpoint === 'default' ? 'default' : 'configured',
      source: 'AI Provider settings base URL or runtime provider baseURL',
      description: 'Optional provider endpoint override state.',
    },
    {
      field: 'runtimeProfile',
      label: 'Runtime profile',
      required: false,
      secretRef: false,
      valueState: providerSetup.runtimeProfile ? 'configured' : 'default',
      source: 'active ~/.xenis profile',
      description: 'Runtime profile name used for provider routing, when loaded.',
    },
    {
      field: 'fallbackPolicy',
      label: 'Fallback policy',
      required: false,
      secretRef: false,
      valueState: providerRouting.fallbackPolicy ? 'configured' : 'default',
      source: 'xenesis runtime providerFallbacks',
      description: 'Fallback chain policy state exposed without credential values.',
    },
    {
      field: 'localCliBoundary',
      label: 'Local CLI boundary',
      required: true,
      secretRef: false,
      valueState: providerSetup.localCliBoundary ? 'configured' : 'unknown',
      source: 'provider setup guardrail',
      description: 'Provider identity remains separate from the installed local CLI integration.',
    },
  ];
  const missingRequiredFields = profileFields
    .filter((field) => field.required && field.valueState === 'missing')
    .map((field) => field.field);
  const reviewSteps = providerProfileDraftReviewSteps({
    provider,
    credentialField,
    modelRequired,
    credentialRequired,
    providerSetup,
    providerRouting,
  });
  const draftStatus = !provider ? 'unknown' : missingRequiredFields.length > 0 ? 'missing-required-field' : 'ready';
  return {
    draftStatus,
    actionInboxKind: 'xenesis-provider-profile-draft',
    provider,
    displayName: provider,
    description: 'Review provider setup fields, routing guardrails, and credential readiness before mutations.',
    setupSurface: 'Settings > AI Provider',
    reviewSurface: 'Desk Action Inbox',
    profileFields,
    missingRequiredFields,
    guardrails: {
      approvalMode: xenesis?.profile.policy.approvalMode ?? 'safe',
      providerRetries: providerSetup.providerRetries,
      fallbackPolicy: providerRouting.fallbackPolicy,
      localCliBoundary: providerSetup.localCliBoundary,
    },
    reviewSteps,
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.providers.profileDrafts.status',
      'xd.xenesis.status',
    ],
    controlPaths: [
      'xd.xenesis.providers.profileDrafts.open',
      'xd.xenesis.providers.profileDrafts.request',
      ...(draftStatus === 'ready' ? ['xd.xenesis.providers.profileDrafts.apply'] : []),
      'xd.xenesis.connections.open',
    ],
    diagnostics: ['provider-profile-draft', 'credential-state', 'provider-footer', 'fallback-policy', 'cr-readback'],
    blockedActions: [
      'change active provider',
      'store provider credentials',
      'mutate fallback chain',
      'switch local CLI selection',
      'run provider prompts',
    ],
    safetyBoundaries: [
      'provider profile draft apply is approval-gated',
      'provider secrets are never returned',
      'provider profile draft apply only updates non-secret AI provider profile settings',
      'provider profile draft apply does not accept raw provider secrets or update secret stores',
      'provider profile draft apply does not mutate fallback chains or local CLI selection',
      'provider prompt execution requires a separate verified Agent run path',
    ],
  };
}

function providerItem(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
  providerFallbacks: XenesisConnectionProviderFallbackInput[] = [],
  env: Record<string, string | undefined> = {},
): XenesisConnectionItem {
  const isLocalProvider = [
    'auto',
    'codex-cli',
    'codex-app-server',
    'claude-cli',
    'claude-interactive',
    'ollama',
    'lmstudio',
  ].includes(aiProvider.provider);
  const hasCredential = isLocalProvider || Boolean(aiProvider.apiKey);
  const hasModel = isLocalProvider || Boolean(aiProvider.model);
  const providerSetup = providerSetupTemplate(aiProvider, xenesis);
  const providerRouting = providerRoutingTemplate(aiProvider, xenesis, providerFallbacks, env);
  return {
    id: `provider-${aiProvider.provider}`,
    kind: 'provider',
    label: `AI provider: ${aiProvider.provider}`,
    status: hasCredential && hasModel ? 'ready' : 'blocked',
    supportLevel: 'implemented',
    summary:
      hasCredential && hasModel
        ? 'Provider has enough settings for first chat.'
        : 'Provider needs a model or credential before reliable Agent use.',
    settingsTarget: 'run-model',
    settingsAction: XENESIS_CONNECTION_PROVIDER_SETTINGS_ACTION,
    providerSetup,
    providerView: providerViewTemplate(aiProvider.provider),
    providerRouting,
    providerProfileDraft: providerProfileDraftTemplate(aiProvider, xenesis, providerSetup, providerRouting),
    setupSteps: [
      'Choose the provider in AI Provider settings.',
      'Set a model and credential only when the selected provider requires them.',
      'Verify the Agent pane footer shows the intended provider before live Desk-control tests.',
    ],
    warnings: hasCredential && hasModel ? [] : ['Check AI Provider settings.'],
  };
}

function mcpItem(mcp: McpSettingsStatus): XenesisConnectionItem {
  return {
    id: 'xenesis-desk-mcp',
    kind: 'mcp',
    label: 'Xenesis Desk MCP',
    status: mcp.available && mcp.bridgeUrl ? 'ready' : 'blocked',
    supportLevel: 'implemented',
    summary:
      mcp.available && mcp.bridgeUrl ? `Bridge available at ${mcp.bridgeUrl}.` : 'MCP bridge status is not available.',
    settingsTarget: 'mcp',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    crActions: ['xd.mcp.settings.status'],
    setupSteps: [
      'Install the Xenesis Desk MCP bridge for the active local CLI provider.',
      'Verify the bridge URL and state file before running external agent control.',
      'Use CR readback paths after control calls to confirm state changes.',
    ],
    warnings: mcp.available ? [] : ['Install or start the Xenesis Desk MCP bridge.'],
  };
}

function localCliItems(providerIntegration: ProviderIntegrationStatus): XenesisConnectionItem[] {
  return providerIntegration.cliTargets.map((target) => ({
    id: `local-cli-${target.id}`,
    kind: 'local-cli',
    label: target.label,
    status: target.mcpInstalled || target.skillInstalled ? 'ready' : 'needs-setup',
    supportLevel: 'implemented',
    summary:
      target.mcpInstalled || target.skillInstalled
        ? 'Local CLI integration files are installed.'
        : 'Local CLI integration can be installed from AI Provider settings.',
    settingsTarget: 'run-model',
    settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
    crActions: ['xd.mcp.settings.status'],
    setupSteps: [
      `Install the ${target.label} MCP or skill integration from AI Provider settings.`,
      'Keep local CLI selection separate from the reasoning provider.',
      'Verify the installed integration appears in the provider work log before live CR control.',
    ],
  }));
}

function gatewayItem(xenesis: XenesisStatus | null): XenesisConnectionItem {
  if (!xenesis) {
    return {
      id: 'xenesis-gateway',
      kind: 'gateway',
      label: 'Xenesis Gateway',
      status: 'unknown',
      supportLevel: 'implemented',
      summary: 'Gateway status could not be read.',
      settingsTarget: 'xenesis-agent',
      settingsAction: XENESIS_CONNECTION_GATEWAY_SETTINGS_ACTION,
      crActions: ['xd.xenesis.gateway.status'],
      setupSteps: [
        'Open Xenesis Agent gateway settings.',
        'Verify the gateway status path before starting external messenger channels.',
      ],
    };
  }
  return {
    id: 'xenesis-gateway',
    kind: 'gateway',
    label: 'Xenesis Gateway',
    status: xenesis.gateway.running ? 'ready' : xenesis.gateway.enabled ? 'needs-setup' : 'disabled',
    supportLevel: 'implemented',
    summary: xenesis.gateway.running
      ? `Gateway is running at ${xenesis.gateway.url || xenesis.url}.`
      : 'Gateway is stopped.',
    settingsTarget: 'xenesis-agent',
    settingsAction: XENESIS_CONNECTION_GATEWAY_SETTINGS_ACTION,
    crActions: [
      'xd.xenesis.gateway.status',
      'xd.xenesis.gateway.start',
      'xd.xenesis.gateway.stop',
      'xd.xenesis.gateway.restart',
    ],
    warnings: xenesis.gateway.running ? [] : ['Start the gateway before using external messenger channels.'],
  };
}

function channelStatus(xenesis: XenesisStatus | null, name: XenesisGatewayChannelName): XenesisConnectionStatus {
  const runtime = xenesis?.gateway.channels?.[name];
  if (!runtime) {
    const profileState = xenesis?.profile.channels.find((state) => state.name === name);
    if (!profileState) return 'unknown';
    if (!profileState.enabled) return 'disabled';
    return profileState.configured ? 'needs-setup' : 'blocked';
  }
  if (!runtime.enabled) return 'disabled';
  if (runtime.ready) return 'ready';
  return runtime.runtimeStatus === 'error' || runtime.missingEnv.length > 0 ? 'blocked' : 'needs-setup';
}

function messengerItems(
  xenesis: XenesisStatus | null,
  env: Record<string, string | undefined> = {},
): XenesisConnectionItem[] {
  return MESSENGERS.map(({ id, label, setupSteps, sourceDocs, channelTemplate }) => {
    const runtime = xenesis?.gateway.channels?.[id];
    const profileChannelSettings = xenesis?.profile.channelSettings?.[id] as Record<string, unknown> | undefined;
    const channelName = id as XenesisProfileChannelName;
    const warnings = [...(runtime?.warnings ?? []), ...(runtime?.lastError ? [runtime.lastError.message] : [])];
    const channelTemplateWithState = {
      ...channelTemplate,
      pairing: channelTemplate.pairing
        ? withChannelPairingCredentialState(channelTemplate.pairing, profileChannelSettings, env)
        : undefined,
    };
    const status = channelStatus(xenesis, id);
    return {
      id,
      kind: 'messenger',
      label,
      status,
      supportLevel: 'implemented',
      summary: runtime?.ready ? `${label} is ready to deliver messages.` : `${label} needs gateway and channel setup.`,
      missingEnv: runtime?.missingEnv,
      settingsTarget: 'xenesis-agent',
      settingsAction: XENESIS_CONNECTION_EXTERNAL_BOTS_SETTINGS_ACTION,
      crActions: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
      setupSteps,
      sourceDocs,
      channelTemplate: channelTemplateWithState,
      channelProfileDraft: buildXenesisChannelProfileDraft(
        { channel: channelName, label, status, channelTemplate: channelTemplateWithState, warnings },
        profileChannelSettings,
        env,
      ),
      messengerView: messengerViewTemplate(id, 'implemented'),
      warnings,
    };
  });
}

function hasReadyItem(items: XenesisConnectionItem[]): boolean {
  return items.some((item) => item.status === 'ready');
}

function hasBlockedItem(items: XenesisConnectionItem[]): boolean {
  return items.some((item) => item.status === 'blocked');
}

function onboardingStatusForReadyOrBlocked(
  ready: boolean,
  blocked: boolean,
  fallback: XenesisConnectionStatus = 'needs-setup',
): XenesisConnectionStatus {
  if (ready) return 'ready';
  if (blocked) return 'blocked';
  return fallback;
}

function settingsActionArgs(action: XenesisConnectionSettingsAction): Record<string, unknown> {
  return {
    category: action.category,
    ...(action.mode ? { mode: action.mode } : {}),
    ...(action.section ? { section: action.section } : {}),
    ensureVisible: true,
  };
}

function onboardingGuidedStep(input: XenesisConnectionOnboardingGuidedStep): XenesisConnectionOnboardingGuidedStep {
  return {
    ...input,
    verifyWith: uniqueStrings(input.verifyWith),
  };
}

function onboardingGuidedStepPaths(
  plan: XenesisConnectionOnboardingPlanTemplate | undefined,
  kinds: XenesisConnectionOnboardingGuidedStepKind[],
): string[] {
  return uniqueStrings(plan?.guidedSteps.filter((step) => kinds.includes(step.kind)).map((step) => step.crPath) ?? []);
}

function onboardingPlanTemplate(input: {
  phase: XenesisConnectionOnboardingPlanPhase;
  setupSurface: string;
  statusReadPaths: string[];
  controlPaths: string[];
  validationChecks: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
  guidedSteps: XenesisConnectionOnboardingGuidedStep[];
}): XenesisConnectionOnboardingPlanTemplate {
  return {
    phase: input.phase,
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: input.setupSurface,
    statusReadPaths: ['xd.xenesis.onboarding.status', 'xd.xenesis.connections.status', ...input.statusReadPaths],
    controlPaths: ['xd.xenesis.onboarding.open', 'xd.xenesis.connections.open', ...input.controlPaths],
    validationChecks: input.validationChecks,
    diagnostics: input.diagnostics,
    safetyBoundaries: [
      'onboarding status is read-only',
      ...(input.safetyBoundaries ?? [
        'onboarding reads do not mutate provider, MCP, tool, gateway, or messenger settings',
      ]),
    ],
    guidedSteps: input.guidedSteps.map(onboardingGuidedStep),
  };
}

function onboardingItems(sections: Omit<XenesisConnectionsStatus['sections'], 'onboarding'>): XenesisConnectionItem[] {
  const provider = sections.provider.items[0];
  const mcp = sections.mcp.items[0];
  const gateway = sections.gateway.items[0];
  const implementedMessengers = sections.messengers.items.filter((item) => item.supportLevel === 'implemented');
  const actionableTools = sections.tools.items.filter((item) => item.supportLevel === 'manual');
  const localCliReady = hasReadyItem(sections.localCli.items);
  const mcpReady = mcp?.status === 'ready';
  const messengerReady = hasReadyItem(implementedMessengers);
  const messengerBlocked = hasBlockedItem(implementedMessengers);
  const gatewayReady = gateway?.status === 'ready';
  const testSendChannel =
    (implementedMessengers.find((item) => item.status === 'ready') ?? implementedMessengers[0])?.channelProfileDraft
      ?.channel ?? 'telegram';

  return [
    {
      id: 'first-chat',
      kind: 'onboarding',
      label: '1. First chat',
      status: provider?.status === 'ready' ? 'ready' : 'blocked',
      supportLevel: 'implemented',
      summary: 'AI provider and model readiness for the first Xenesis Agent response.',
      settingsTarget: 'run-model',
      settingsAction: XENESIS_CONNECTION_PROVIDER_SETTINGS_ACTION,
      setupSteps: [
        'Choose the active AI provider from user settings.',
        'Confirm the selected provider has the required model and credential.',
        'Run a normal Agent pane chat before testing Desk-control prompts.',
      ],
      crActions: ['xd.xenesis.connections.status'],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'first-chat',
        setupSurface: 'Settings > AI Provider',
        statusReadPaths: ['xd.xenesis.providers.setup.status'],
        controlPaths: ['xd.panes.settings.open'],
        validationChecks: ['provider-ready', 'normal-agent-chat', 'cr-readback'],
        diagnostics: ['provider-footer', 'runtime-provider', 'missing-credential'],
        safetyBoundaries: [
          'provider settings are not mutated by onboarding reads',
          'credential values are never returned',
        ],
        guidedSteps: [
          {
            id: 'read-provider-setup',
            label: 'Read provider setup',
            kind: 'read',
            crPath: 'xd.xenesis.providers.setup.status',
            expectedState: 'Active provider, runtime profile, credential state, and fallback behavior are visible.',
            verifyWith: ['provider-ready', 'runtime-provider', 'provider-footer'],
            safetyBoundary: 'credential values are never returned',
          },
          {
            id: 'open-provider-settings',
            label: 'Open provider settings',
            kind: 'open',
            crPath: 'xd.panes.settings.open',
            args: settingsActionArgs(XENESIS_CONNECTION_PROVIDER_SETTINGS_ACTION),
            expectedState: 'The AI Provider settings surface is opened for explicit user edits.',
            verifyWith: ['normal-agent-chat', 'cr-readback'],
            safetyBoundary: 'provider settings changes stay on explicit user actions',
          },
        ],
      }),
      warnings: provider?.warnings,
    },
    {
      id: 'local-cli-mcp',
      kind: 'onboarding',
      label: '2. Local CLI and MCP',
      status: onboardingStatusForReadyOrBlocked(localCliReady && mcpReady, mcp?.status === 'blocked'),
      supportLevel: 'implemented',
      summary: 'Local CLI integration and Xenesis Desk MCP bridge readiness for CR-capable providers.',
      settingsTarget: 'run-model',
      settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
      setupSteps: [
        'Install the selected local CLI integration when the provider needs it.',
        'Register the Xenesis Desk MCP bridge for that local CLI.',
        'Verify MCP status through the Connection Center before relying on external agent control.',
      ],
      crActions: ['xd.mcp.settings.status', 'xd.xenesis.connections.status'],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'local-runtime',
        setupSurface: 'Settings > AI Provider > Local CLI MCP',
        statusReadPaths: ['xd.mcp.settings.status', 'xd.xenesis.providers.setup.status'],
        controlPaths: ['xd.panes.settings.open'],
        validationChecks: ['local-cli-selected', 'mcp-bridge-registered', 'cr-readback'],
        diagnostics: ['mcp-settings-status', 'local-cli-config', 'provider-runtime'],
        safetyBoundaries: [
          'local CLI and MCP setup reads do not install tools',
          'MCP config mutations stay on explicit settings actions',
        ],
        guidedSteps: [
          {
            id: 'read-mcp-settings',
            label: 'Read MCP bridge settings',
            kind: 'read',
            crPath: 'xd.mcp.settings.status',
            expectedState: 'Local CLI MCP config path, bridge URL, and registration state are visible.',
            verifyWith: ['mcp-settings-status', 'mcp-bridge-registered'],
            safetyBoundary: 'MCP bridge status reads do not rewrite local CLI config files',
          },
          {
            id: 'read-provider-runtime',
            label: 'Read provider runtime',
            kind: 'read',
            crPath: 'xd.xenesis.providers.setup.status',
            expectedState: 'The selected provider runtime can reach the Desk MCP bridge when required.',
            verifyWith: ['local-cli-selected', 'provider-runtime', 'cr-readback'],
            safetyBoundary: 'provider runtime reads do not install local CLI adapters',
          },
          {
            id: 'open-local-cli-settings',
            label: 'Open local CLI settings',
            kind: 'open',
            crPath: 'xd.panes.settings.open',
            args: settingsActionArgs(XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION),
            expectedState: 'The Local CLI MCP settings surface is opened for explicit registration work.',
            verifyWith: ['local-cli-config'],
            safetyBoundary: 'MCP config mutations stay on explicit settings actions',
          },
        ],
      }),
    },
    {
      id: 'recommended-tools',
      kind: 'onboarding',
      label: '3. Recommended tools',
      status: actionableTools.length > 0 ? 'needs-setup' : 'ready',
      supportLevel: 'manual',
      summary: 'Manual MCP recipes for Fetch, Filesystem, GitHub, Notion, Linear, and planned Google tools.',
      settingsTarget: 'mcp',
      settingsAction: XENESIS_CONNECTION_LOCAL_CLI_MCP_SETTINGS_ACTION,
      setupSteps: [
        'Install only the MCP tools needed for the current workspace.',
        'Use narrow tokens and scopes for GitHub, Notion, Linear, Google Workspace, and Calendar integrations.',
        'Verify read tools before enabling write workflows or remote actions.',
      ],
      sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'external-tools',
        setupSurface: 'Settings > Xenesis Agent > Connections',
        statusReadPaths: [
          'xd.xenesis.tools.setup.status',
          'xd.xenesis.tools.connectors.status',
          'xd.xenesis.tools.installPlans.status',
          'xd.xenesis.tools.userStories.status',
        ],
        controlPaths: [
          'xd.xenesis.tools.views.open',
          'xd.xenesis.tools.installPlans.open',
          'xd.xenesis.tools.userStories.open',
        ],
        validationChecks: ['tool-setup-reviewed', 'connector-readiness-reviewed', 'mcp-readback'],
        diagnostics: ['missing-env', 'planned-oauth', 'mcp-settings-status'],
        safetyBoundaries: [
          'external tool onboarding does not install MCP servers',
          'external tool onboarding does not execute provider tools',
          'secret values are never returned',
        ],
        guidedSteps: [
          {
            id: 'read-tool-setup',
            label: 'Read tool setup status',
            kind: 'read',
            crPath: 'xd.xenesis.tools.setup.status',
            expectedState:
              'Manual MCP templates and planned OAuth tools show auth mode, scopes, and verification state.',
            verifyWith: ['tool-setup-reviewed', 'planned-oauth', 'missing-env'],
            safetyBoundary: 'tool setup reads do not install MCP servers or start OAuth flows',
          },
          {
            id: 'read-tool-connectors',
            label: 'Read connector readiness',
            kind: 'read',
            crPath: 'xd.xenesis.tools.connectors.status',
            expectedState: 'Connector credential state and runtime support are visible without exposing secret values.',
            verifyWith: ['connector-readiness-reviewed', 'mcp-readback'],
            safetyBoundary: 'secret values are never returned',
          },
          {
            id: 'open-tool-install-plans',
            label: 'Open tool install plans',
            kind: 'open',
            crPath: 'xd.xenesis.tools.installPlans.open',
            args: { ensureVisible: true },
            expectedState: 'The install plan surface opens for copy-ready templates or review-only planned OAuth gaps.',
            verifyWith: ['tool-setup-reviewed', 'planned-oauth'],
            safetyBoundary: 'install plan opens do not execute package managers or write provider config',
          },
          {
            id: 'open-tool-user-stories',
            label: 'Open tool user stories',
            kind: 'open',
            crPath: 'xd.xenesis.tools.userStories.open',
            args: { ensureVisible: true },
            expectedState: 'Hermes-style tool workflows are visible before enabling provider tool execution.',
            verifyWith: ['mcp-readback', 'connector-readiness-reviewed'],
            safetyBoundary: 'user-story opens do not execute provider tools',
          },
        ],
      }),
    },
    {
      id: 'gateway',
      kind: 'onboarding',
      label: '4. Gateway',
      status: gateway?.status ?? 'unknown',
      supportLevel: 'implemented',
      summary: 'Gateway lifecycle readiness before any external messenger can deliver prompts.',
      settingsTarget: 'xenesis-agent',
      settingsAction: XENESIS_CONNECTION_GATEWAY_SETTINGS_ACTION,
      setupSteps: [
        'Enable and start the Xenesis Gateway.',
        'Verify the gateway URL and runtime status through CR readback.',
        'Keep gateway restart/stop actions on CR paths so audit records remain visible.',
      ],
      crActions: ['xd.xenesis.gateway.status', 'xd.xenesis.gateway.start', 'xd.xenesis.gateway.restart'],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'gateway',
        setupSurface: 'Settings > Xenesis Agent > Gateway',
        statusReadPaths: ['xd.xenesis.gateway.status', 'xd.xenesis.status'],
        controlPaths: ['xd.panes.settings.open', 'xd.xenesis.gateway.start', 'xd.xenesis.gateway.restart'],
        validationChecks: ['gateway-enabled', 'gateway-running', 'gateway-cr-readback'],
        diagnostics: ['gateway-status', 'gateway-url', 'gateway-last-error'],
        safetyBoundaries: [
          'gateway onboarding status does not start or restart the gateway',
          'gateway lifecycle changes stay on explicit CR control paths',
        ],
        guidedSteps: [
          {
            id: 'read-gateway-status',
            label: 'Read gateway status',
            kind: 'read',
            crPath: 'xd.xenesis.gateway.status',
            expectedState: 'Gateway enabled/running state, URL, workspace, and last error are visible.',
            verifyWith: ['gateway-enabled', 'gateway-running', 'gateway-status', 'gateway-url'],
            safetyBoundary: 'gateway status reads do not start or restart the gateway',
          },
          {
            id: 'read-xenesis-status',
            label: 'Read Xenesis runtime status',
            kind: 'read',
            crPath: 'xd.xenesis.status',
            expectedState:
              'Desk runtime state confirms the active workspace and provider runtime before channel setup.',
            verifyWith: ['gateway-cr-readback', 'gateway-last-error'],
            safetyBoundary: 'runtime status reads do not mutate gateway lifecycle settings',
          },
          {
            id: 'open-gateway-settings',
            label: 'Open gateway settings',
            kind: 'open',
            crPath: 'xd.panes.settings.open',
            args: settingsActionArgs(XENESIS_CONNECTION_GATEWAY_SETTINGS_ACTION),
            expectedState: 'Gateway settings open for explicit enable/start configuration.',
            verifyWith: ['gateway-enabled'],
            safetyBoundary: 'gateway configuration changes stay on explicit user actions',
          },
          {
            id: 'start-gateway',
            label: 'Start gateway',
            kind: 'control',
            crPath: 'xd.xenesis.gateway.start',
            expectedState: 'The gateway starts only when the user explicitly invokes the control path.',
            verifyWith: ['gateway-running', 'gateway-cr-readback'],
            safetyBoundary: 'gateway lifecycle changes stay on explicit CR control paths',
          },
        ],
      }),
      warnings: gateway?.warnings,
    },
    {
      id: 'messenger-routing',
      kind: 'onboarding',
      label: '5. Messenger routing',
      status: onboardingStatusForReadyOrBlocked(
        messengerReady,
        messengerBlocked,
        gatewayReady ? 'needs-setup' : 'blocked',
      ),
      supportLevel: 'implemented',
      summary: 'External messenger channel configuration, allowlists, and route safety.',
      settingsTarget: 'xenesis-agent',
      settingsAction: XENESIS_CONNECTION_EXTERNAL_BOTS_SETTINGS_ACTION,
      setupSteps: [
        'Configure one supported channel: Telegram, Slack, Discord, or webhook.',
        'Set required token or webhook environment variable names without storing secrets in Desk settings.',
        'Add the chat, channel, guild, or webhook allowlist before enabling delivery.',
        'Avoid channels where Xenesis can receive its own outbound messages.',
      ],
      sourceDocs: [{ label: 'OpenClaw channel routing', url: 'https://docs.openclaw.ai/channels/channel-routing' }],
      crActions: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'messenger-routing',
        setupSurface: 'Settings > Xenesis Agent > External bots',
        statusReadPaths: [
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
          'xd.xenesis.channels.accessGroups.status',
          'xd.xenesis.channels.pairing.status',
        ],
        controlPaths: [
          'xd.panes.settings.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
        ],
        validationChecks: ['gateway-ready', 'channel-pairing-ready', 'allowlist-reviewed', 'loop-protection-reviewed'],
        diagnostics: ['missing-env', 'allowlist-empty', 'safe-to-deliver', 'gateway-status'],
        safetyBoundaries: [
          'messenger onboarding status does not mutate channel settings',
          'planned messenger adapters remain planning surfaces until verified',
          'raw channel identifiers and secrets are never returned',
        ],
        guidedSteps: [
          {
            id: 'read-channel-routing',
            label: 'Read channel routing',
            kind: 'read',
            crPath: 'xd.xenesis.channels.routing.status',
            expectedState: 'Implemented and planned channel routing state is visible with safe delivery indicators.',
            verifyWith: ['gateway-ready', 'channel-pairing-ready', 'safe-to-deliver'],
            safetyBoundary: 'messenger routing reads do not mutate channel settings',
          },
          {
            id: 'read-channel-safety',
            label: 'Read channel safety',
            kind: 'read',
            crPath: 'xd.xenesis.channels.safety.status',
            expectedState: 'Loop protection, delivery safety, and secret redaction checks are visible.',
            verifyWith: ['loop-protection-reviewed', 'safe-to-deliver'],
            safetyBoundary: 'raw channel identifiers and secrets are never returned',
          },
          {
            id: 'read-access-groups',
            label: 'Read access groups',
            kind: 'read',
            crPath: 'xd.xenesis.channels.accessGroups.status',
            expectedState: 'Allowlist binding fields are visible before delivery is enabled.',
            verifyWith: ['allowlist-reviewed', 'allowlist-empty'],
            safetyBoundary: 'access group reads do not add or remove allowlist entries',
          },
          {
            id: 'read-channel-pairing',
            label: 'Read channel pairing',
            kind: 'read',
            crPath: 'xd.xenesis.channels.pairing.status',
            expectedState: 'Channel pairing prerequisites and missing environment bindings are visible.',
            verifyWith: ['channel-pairing-ready', 'missing-env'],
            safetyBoundary: 'pairing reads do not create external messenger subscriptions',
          },
          {
            id: 'open-external-bots-settings',
            label: 'Open external bot settings',
            kind: 'open',
            crPath: 'xd.panes.settings.open',
            args: settingsActionArgs(XENESIS_CONNECTION_EXTERNAL_BOTS_SETTINGS_ACTION),
            expectedState: 'External bot settings open for explicit token env, guardrail, and allowlist edits.',
            verifyWith: ['allowlist-reviewed', 'gateway-ready'],
            safetyBoundary: 'messenger settings changes stay on explicit user actions',
          },
          {
            id: 'update-channel-profile',
            label: 'Update channel profile',
            kind: 'control',
            crPath: 'xd.xenesis.profiles.updateChannels',
            expectedState: 'Channel settings change only through the explicit profile update control path.',
            verifyWith: ['allowlist-reviewed', 'gateway-ready'],
            safetyBoundary: 'messenger settings changes stay on explicit CR control paths',
          },
        ],
      }),
    },
    {
      id: 'test-send',
      kind: 'onboarding',
      label: '6. End-to-end test',
      status: onboardingStatusForReadyOrBlocked(provider?.status === 'ready' && gatewayReady && messengerReady, false),
      supportLevel: 'implemented',
      summary: 'Sanitized channel test send and CR readback after setup.',
      settingsTarget: 'xenesis-agent',
      settingsAction: XENESIS_CONNECTION_EXTERNAL_BOTS_SETTINGS_ACTION,
      setupSteps: [
        'Use the per-channel test button or CR test path with a sanitized message.',
        'Confirm the runtime status stays ready after the test send.',
        'Inspect diagnostics or bot session records if delivery fails.',
      ],
      crActions: ['xd.xenesis.profiles.testChannel', 'xd.xenesis.connections.status'],
      onboardingPlan: onboardingPlanTemplate({
        phase: 'end-to-end-test',
        setupSurface: 'Settings > Xenesis Agent > External bots',
        statusReadPaths: ['xd.xenesis.gateway.status', 'xd.xenesis.channels.routing.status'],
        controlPaths: ['xd.xenesis.profiles.testChannel', 'xd.panes.settings.open'],
        validationChecks: ['provider-ready', 'gateway-ready', 'messenger-ready', 'sanitized-test-send'],
        diagnostics: ['test-channel-result', 'gateway-status', 'bot-session-records'],
        safetyBoundaries: [
          'test-send onboarding status does not send messages',
          'message delivery stays on explicit channel test CR paths',
        ],
        guidedSteps: [
          {
            id: 'read-test-prerequisites',
            label: 'Read test prerequisites',
            kind: 'read',
            crPath: 'xd.xenesis.gateway.status',
            expectedState: 'Gateway, provider, and messenger prerequisites are ready before a channel test is offered.',
            verifyWith: ['provider-ready', 'gateway-ready', 'messenger-ready'],
            safetyBoundary: 'test-send onboarding status does not send messages',
          },
          {
            id: 'read-routing-before-test',
            label: 'Read routing before test',
            kind: 'read',
            crPath: 'xd.xenesis.channels.routing.status',
            expectedState: 'The selected channel reports safe-to-deliver before a sanitized test send is allowed.',
            verifyWith: ['messenger-ready', 'gateway-status'],
            safetyBoundary: 'routing reads do not deliver channel messages',
          },
          {
            id: 'send-sanitized-test',
            label: 'Send sanitized test',
            kind: 'control',
            crPath: 'xd.xenesis.profiles.testChannel',
            args: { channel: testSendChannel },
            expectedState: 'A sanitized test message is sent only through the explicit channel test CR path.',
            verifyWith: ['sanitized-test-send', 'test-channel-result', 'bot-session-records'],
            safetyBoundary: 'sanitized message delivery stays on explicit channel test CR paths',
          },
        ],
      }),
    },
  ];
}

export function buildXenesisConnectionsStatus(input: BuildXenesisConnectionsStatusInput): XenesisConnectionsStatus {
  const baseSections: Omit<XenesisConnectionsStatus['sections'], 'onboarding'> = {
    provider: {
      id: 'provider',
      label: 'AI Provider',
      items: [providerItem(input.aiProvider, input.xenesis, input.providerFallbacks, input.env)],
    },
    localCli: { id: 'local-cli', label: 'Local CLI integration', items: localCliItems(input.providerIntegration) },
    mcp: { id: 'mcp', label: 'MCP bridge', items: [mcpItem(input.mcp)] },
    tools: { id: 'tools', label: 'Tool connections', items: toolConnectionItems(input.env) },
    gateway: { id: 'gateway', label: 'Gateway', items: [gatewayItem(input.xenesis)] },
    messengers: {
      id: 'messengers',
      label: 'Messengers',
      items: [...messengerItems(input.xenesis, input.env), ...PLANNED_MESSENGERS],
    },
    guides: {
      id: 'guides',
      label: 'Guides',
      items: withGuideOpenPaths(XENESIS_CONNECTION_GUIDES, input.repoRoot, input.guideFileExists),
    },
  };
  const rawSections: XenesisConnectionsStatus['sections'] = {
    onboarding: { id: 'onboarding', label: 'Onboarding checklist', items: onboardingItems(baseSections) },
    ...baseSections,
  };
  const sections = withXenesisConnectionSetupRequests(
    withXenesisConnectionDiagnosticRunbooks(
      withXenesisConnectionChannelSetupPlans(
        withXenesisConnectionToolSetupPlans(withXenesisConnectionProviderSetupPlans(rawSections)),
      ),
    ),
  );
  const summary = countItems(sections);
  return {
    ok: summary.blocked === 0,
    updatedAt: (input.now ?? new Date()).toISOString(),
    summary,
    sections,
    warnings: summary.blocked > 0 ? ['Some connections need setup before they are ready.'] : [],
  };
}
