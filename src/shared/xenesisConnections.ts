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

export interface XenesisConnectionOnboardingPlanTemplate {
  phase: XenesisConnectionOnboardingPlanPhase;
  primarySurface: string;
  setupSurface: string;
  statusReadPaths: string[];
  controlPaths: string[];
  validationChecks: string[];
  diagnostics: string[];
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

export interface XenesisConnectionChannelProfileDraftTemplate {
  draftStatus: XenesisConnectionChannelProfileDraftStatus;
  actionInboxKind: 'xenesis-channel-profile-draft';
  channel: XenesisProfileChannelName;
  displayName: string;
  description?: string;
  setupSurface: string;
  reviewSurface: string;
  profileFields: XenesisConnectionChannelProfileDraftField[];
  missingRequiredFields: string[];
  guardrails: XenesisConnectionChannelProfileDraftGuardrails;
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
  toolSetup?: XenesisConnectionToolSetupTemplate;
  toolInstallPlan?: XenesisConnectionToolInstallPlanTemplate;
  toolConnector?: XenesisConnectionToolConnectorTemplate;
  toolOAuthDraft?: XenesisConnectionToolOAuthDraftTemplate;
  mcpInstallDraft?: XenesisConnectionMcpInstallDraftTemplate;
  toolView?: XenesisConnectionToolViewTemplate;
  toolUserStory?: XenesisConnectionToolUserStoryTemplate;
  toolActionCatalog?: XenesisConnectionToolActionCatalogTemplate;
  messengerView?: XenesisConnectionMessengerViewTemplate;
  channelProfileDraft?: XenesisConnectionChannelProfileDraftTemplate;
  guideCatalog?: XenesisConnectionGuideCatalogTemplate;
  channelTemplate?: XenesisConnectionChannelTemplate;
  diagnosticRunbook?: XenesisConnectionDiagnosticRunbookTemplate;
  setupRequest?: XenesisConnectionSetupRequestTemplate;
  warnings?: string[];
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
}

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
    id: 'agent-user-stories',
    kind: 'guide',
    label: 'Agent user stories',
    status: 'ready',
    summary:
      'Hermes-style user story templates for provider setup, external tools, messenger ingress, and CR-controlled Desk workflows.',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    sourceDocs: [
      { label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' },
      { label: 'Hermes MCP feature', url: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp' },
      { label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' },
    ],
    guideCatalog: {
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
      prerequisites: [
        'connection catalog readback',
        'provider routing readback',
        'tool view readback',
        'messenger view readback',
      ],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.providers.routing.status',
        'xd.xenesis.tools.views.status',
        'xd.xenesis.messengers.views.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: [
        'xd.xenesis.guides.open',
        'xd.xenesis.providers.views.open',
        'xd.xenesis.tools.views.open',
        'xd.xenesis.messengers.views.open',
      ],
      userStoryTemplates: [
        'inspect active provider routing before running a task',
        'connect Notion or Google Calendar as a planned MCP/OAuth workflow',
        'open a messenger setup view and verify routing/safety before remote prompts',
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

function withGuideOpenPaths(items: XenesisConnectionItem[], repoRoot: string | undefined): XenesisConnectionItem[] {
  return items.map((item) => {
    const guideOpenPath = resolveRepoLocalPath(repoRoot, item.guidePath);
    if (!guideOpenPath || guideOpenPath === item.guideOpenPath) return item;
    return { ...item, guideOpenPath };
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
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: options.hasMcpTemplate
      ? ['mcp-settings-status', 'missing-env', 'template-snippet']
      : ['mcp-settings-status', 'missing-env'],
    safetyBoundaries: [
      'view opens internal setup/readiness surfaces only',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  };
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
    controlPaths: [
      'xd.xenesis.tools.installPlans.open',
      'xd.xenesis.tools.views.open',
      'xd.xenesis.connections.open',
      'xd.panes.settings.open',
    ],
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
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
      ...(implemented ? ['xd.xenesis.channels.routing.status', 'xd.xenesis.gateway.status'] : []),
    ],
    controlPaths: implemented
      ? [
          'xd.xenesis.messengers.views.open',
          'xd.xenesis.connections.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
          'xd.panes.settings.open',
        ]
      : ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
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

function plannedMessenger(definition: PlannedMessengerDefinition): XenesisConnectionItem {
  return {
    ...definition,
    channelTemplate: {
      ...definition.channelTemplate,
      pairing: definition.channelTemplate.pairing ?? plannedChannelPairingTemplate(definition.id),
      userStory:
        definition.channelTemplate.userStory ?? plannedChannelUserStoryTemplate(definition.id, definition.label),
    },
    kind: 'messenger',
    status: 'planned',
    supportLevel: 'planned',
    messengerView: messengerViewTemplate(definition.id, 'planned'),
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
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
  'does not mutate provider/tool/channel settings',
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

const XENESIS_TOOL_OAUTH_DRAFT_IDS = ['google-workspace', 'google-calendar'] as const;

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

const XENESIS_CHANNEL_PROFILE_DRAFT_BLOCKED_ACTIONS = [
  'mutate channel settings',
  'update allowlists',
  'write profile config',
  'send test message',
  'start gateway',
  'store secrets',
  'bypass approvals',
];

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
    guardrails: {
      approvalMode: channelProfileDraftApprovalMode(settings?.approvalMode),
      maxTurns: channelProfileDraftPositiveInteger(settings?.maxTurns, 12),
      maxTokens: channelProfileDraftPositiveInteger(settings?.maxTokens, 120000),
    },
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
      'channel profile drafts are review-only',
      'channel profile draft does not mutate channel settings or update allowlists',
      'channel profile draft does not write profile config or send test messages',
      'secret values are never returned',
      ...(input.channelTemplate?.safetyControls ?? []),
      ...(input.channelTemplate?.safety?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.accessGroups?.safetyBoundaries ?? []),
      ...(input.channelTemplate?.pairing?.safetyBoundaries ?? []),
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
      'MCP install draft does not write MCP config or run shell commands',
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

function buildXenesisToolOAuthDraft(item: XenesisConnectionItem): XenesisConnectionToolOAuthDraftTemplate | undefined {
  if (!(XENESIS_TOOL_OAUTH_DRAFT_IDS as readonly string[]).includes(item.id)) return undefined;
  if (item.toolConnector?.authMode !== 'oauth') return undefined;

  const missingRequiredFields = ['oauthClient', 'redirectUri', 'tokenStore'];
  const scopes = uniqueStrings(item.toolConnector.dataScopes);
  const calendarBlockedActions =
    item.id === 'google-calendar'
      ? ['create/update/delete calendar events without approval', 'mutate calendar events']
      : [];
  const workspaceBlockedActions =
    item.id === 'google-workspace' ? ['send email', 'mutate Google documents', 'mutate documents'] : [];

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
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.oauthDrafts.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.installPlans.status',
      'xd.xenesis.tools.actions.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: [
      'xd.xenesis.tools.oauthDrafts.open',
      'xd.xenesis.tools.oauthDrafts.request',
      'xd.xenesis.connections.open',
      'xd.panes.settings.open',
    ],
    diagnostics: uniqueStrings([
      'planned-oauth-template',
      'scope-review',
      'token-store-review',
      'oauth-consent-review',
      'cr-readback',
      ...(item.toolConnector.diagnostics ?? []),
    ]),
    blockedActions: uniqueStrings([
      ...XENESIS_TOOL_OAUTH_DRAFT_BLOCKED_ACTIONS,
      ...workspaceBlockedActions,
      ...calendarBlockedActions,
    ]),
    safetyBoundaries: uniqueStrings([
      'tool OAuth drafts are review-only',
      'tool OAuth draft does not complete OAuth, store tokens, write MCP config, execute provider tools, mutate settings, send email, mutate documents, or mutate calendar events',
      'credential values, OAuth client secrets, OAuth tokens, and consent responses are never returned',
      'Google tool writes require separate verified approval-gated execution paths',
      ...(item.toolConnector.safetyBoundaries ?? []),
      ...(item.toolInstallPlan?.safetyBoundaries ?? []),
      ...(item.toolActionCatalog?.safetyBoundaries ?? []),
      ...(item.warnings ?? []),
    ]),
  };
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
        readPaths: ['xd.xenesis.onboarding.status', ...item.onboardingPlan.statusReadPaths],
        controlPaths: item.onboardingPlan.controlPaths,
        diagnostics: [...item.onboardingPlan.validationChecks, ...item.onboardingPlan.diagnostics],
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
        readPaths: ['xd.xenesis.providers.profileDrafts.status', ...item.providerProfileDraft.readPaths],
        controlPaths: item.providerProfileDraft.controlPaths,
        diagnostics: [...item.providerProfileDraft.missingRequiredFields, ...item.providerProfileDraft.diagnostics],
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
        readPaths: ['xd.xenesis.tools.oauthDrafts.status', ...item.toolOAuthDraft.readPaths],
        controlPaths: item.toolOAuthDraft.controlPaths,
        diagnostics: [
          ...item.toolOAuthDraft.missingRequiredFields,
          ...item.toolOAuthDraft.scopes,
          ...item.toolOAuthDraft.diagnostics,
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
        readPaths: ['xd.xenesis.channels.profileDrafts.status', ...item.channelProfileDraft.readPaths],
        controlPaths: item.channelProfileDraft.controlPaths,
        diagnostics: [...item.channelProfileDraft.missingRequiredFields, ...item.channelProfileDraft.diagnostics],
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
        readPaths: ['xd.xenesis.guides.status', ...item.guideCatalog.readPaths],
        controlPaths: item.guideCatalog.controlPaths,
        diagnostics: [...item.guideCatalog.validationChecks, ...item.guideCatalog.userStoryTemplates],
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
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.safetyBoundaries ?? []),
      ...(item.providerView?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.safetyBoundaries ?? []),
      ...(item.toolSetup?.riskControls ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.safetyBoundaries ?? []),
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
      ...(item.messengerView?.safetyBoundaries ?? []),
      ...(item.guideCatalog?.safetyBoundaries ?? []),
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
    ...(item.providerSetup?.verification ?? []),
    ...(item.providerRouting?.diagnostics ?? []),
    ...(item.providerProfileDraft?.diagnostics ?? []),
    ...(item.toolSetup?.verification ?? []),
    ...(item.toolConnector?.validationChecks ?? []),
    ...(item.toolOAuthDraft?.diagnostics ?? []),
    ...(item.toolActionCatalog?.diagnostics ?? []),
    ...(item.toolInstallPlan?.diagnostics ?? []),
    ...(item.mcpInstallDraft?.diagnostics ?? []),
    ...(item.channelTemplate?.routing?.diagnostics ?? []),
    ...(item.channelTemplate?.safety?.troubleshooting ?? []),
    ...(item.channelTemplate?.accessGroups?.diagnostics ?? []),
    ...(item.channelTemplate?.pairing?.validationChecks ?? []),
    ...(item.channelTemplate?.userStory?.diagnostics ?? []),
    ...(item.channelProfileDraft?.diagnostics ?? []),
    ...(item.guideCatalog?.validationChecks ?? []),
  ]);
}

function setupRequestStepItems(item: XenesisConnectionItem): string[] {
  return uniqueStrings([
    ...(item.setupSteps ?? []),
    ...(item.onboardingPlan?.validationChecks.map((check) => `verify ${check}`) ?? []),
    ...(item.providerSetup?.verification.map((check) => `verify ${check}`) ?? []),
    ...(item.providerProfileDraft?.missingRequiredFields.map((field) => `review provider profile field: ${field}`) ??
      []),
    ...(item.toolOAuthDraft?.missingRequiredFields.map((field) => `review OAuth draft field: ${field}`) ?? []),
    ...(item.toolOAuthDraft?.scopes.map((scope) => `review OAuth scope: ${scope}`) ?? []),
    ...(item.toolInstallPlan?.installSteps ?? []),
    ...(item.mcpInstallDraft?.installSteps ?? []),
    ...(item.toolConnector?.validationChecks.map((check) => `validate ${check}`) ?? []),
    ...(item.toolSetup?.verification.map((check) => `verify ${check}`) ?? []),
    ...(item.channelTemplate?.pairing?.validationChecks.map((check) => `validate ${check}`) ?? []),
    ...(item.channelTemplate?.accessGroups?.bindings.map(
      (binding) => `review ${binding.field}: ${binding.description}`,
    ) ?? []),
    ...(item.channelTemplate?.userStory?.prerequisiteSetup.map((check) => `verify ${check}`) ?? []),
    ...(item.channelProfileDraft?.missingRequiredFields.map((field) => `review channel profile field: ${field}`) ?? []),
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

function buildXenesisConnectionSetupRequest(item: XenesisConnectionItem): XenesisConnectionSetupRequestTemplate {
  const diagnostics = setupRequestDiagnosticItems(item);
  const steps = setupRequestStepItems(item);
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
      ...(item.providerSetup?.crReadPaths ?? []),
      ...(item.providerRouting?.readPaths ?? []),
      ...(item.providerView?.readPaths ?? []),
      ...(item.providerProfileDraft?.readPaths ?? []),
      ...(item.toolSetup?.crReadPaths ?? []),
      ...(item.toolConnector?.readPaths ?? []),
      ...(item.toolOAuthDraft?.readPaths ?? []),
      ...(item.toolView?.readPaths ?? []),
      ...(item.toolUserStory?.readPaths ?? []),
      ...(item.toolInstallPlan?.readPaths ?? []),
      ...(item.mcpInstallDraft?.readPaths ?? []),
      ...(item.channelTemplate?.safety?.readPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.readPaths ?? []),
      ...(item.channelTemplate?.pairing?.readPaths ?? []),
      ...(item.channelTemplate?.userStory?.readPaths ?? []),
      ...(item.channelProfileDraft?.readPaths ?? []),
      ...(item.messengerView?.readPaths ?? []),
      ...(item.guideCatalog?.readPaths ?? []),
    ]),
    controlPaths: uniqueStrings([
      'xd.xenesis.connections.setupRequests.open',
      'xd.xenesis.connections.setupRequests.request',
      'xd.xenesis.connections.open',
      ...(item.diagnosticRunbook?.controlPaths ?? []),
      ...(item.onboardingPlan?.controlPaths ?? []),
      ...(item.providerView?.controlPaths ?? []),
      ...(item.providerProfileDraft?.controlPaths ?? []),
      ...(item.crActions ?? []),
      ...(item.toolConnector?.controlPaths ?? []),
      ...(item.toolOAuthDraft?.controlPaths ?? []),
      ...(item.toolView?.controlPaths ?? []),
      ...(item.toolActionCatalog?.controlPaths ?? []),
      ...(item.toolUserStory?.controlPaths ?? []),
      ...(item.toolInstallPlan?.controlPaths ?? []),
      ...(item.mcpInstallDraft?.controlPaths ?? []),
      ...(item.channelTemplate?.safety?.controlPaths ?? []),
      ...(item.channelTemplate?.accessGroups?.controlPaths ?? []),
      ...(item.channelTemplate?.pairing?.controlPaths ?? []),
      ...(item.channelTemplate?.userStory?.controlPaths ?? []),
      ...(item.channelProfileDraft?.controlPaths ?? []),
      ...(item.messengerView?.controlPaths ?? []),
      ...(item.guideCatalog?.controlPaths ?? []),
    ]),
    diagnostics,
    blockedActions: [...XENESIS_CONNECTION_SETUP_REQUEST_BLOCKED_ACTIONS],
    safetyBoundaries: uniqueStrings([
      'setup requests record local Action Inbox review items only',
      'setup requests do not install MCP servers, complete OAuth, store tokens, execute provider tools, mutate settings, or send messages',
      ...(item.diagnosticRunbook?.safetyBoundaries ?? []),
      ...(item.onboardingPlan?.safetyBoundaries ?? []),
      ...(item.providerSetup?.riskControls ?? []),
      ...(item.providerRouting?.safetyBoundaries ?? []),
      ...(item.providerView?.safetyBoundaries ?? []),
      ...(item.providerProfileDraft?.safetyBoundaries ?? []),
      ...(item.toolSetup?.riskControls ?? []),
      ...(item.toolConnector?.safetyBoundaries ?? []),
      ...(item.toolOAuthDraft?.safetyBoundaries ?? []),
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
    controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
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
  return {
    draftStatus: !provider ? 'unknown' : missingRequiredFields.length > 0 ? 'missing-required-field' : 'ready',
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
      'xd.xenesis.connections.open',
      'xd.panes.settings.open',
    ],
    diagnostics: ['provider-profile-draft', 'credential-state', 'provider-footer', 'fallback-policy', 'cr-readback'],
    blockedActions: [
      'change active provider',
      'change provider model',
      'store provider credentials',
      'mutate fallback chain',
      'switch local CLI selection',
      'run provider prompts',
    ],
    safetyBoundaries: [
      'provider profile drafts are review-only',
      'provider secrets are never returned',
      'provider profile draft does not mutate provider settings, model settings, fallback chains, credentials, or local CLI selection',
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
    settingsAction: { category: 'run-model', section: 'default' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
      settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
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
    settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
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
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
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

function onboardingPlanTemplate(input: {
  phase: XenesisConnectionOnboardingPlanPhase;
  setupSurface: string;
  statusReadPaths: string[];
  controlPaths: string[];
  validationChecks: string[];
  diagnostics: string[];
  safetyBoundaries?: string[];
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

  return [
    {
      id: 'first-chat',
      kind: 'onboarding',
      label: '1. First chat',
      status: provider?.status === 'ready' ? 'ready' : 'blocked',
      supportLevel: 'implemented',
      summary: 'AI provider and model readiness for the first Xenesis Agent response.',
      settingsTarget: 'run-model',
      settingsAction: { category: 'run-model', section: 'default' },
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
      settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
      settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
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
      settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
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
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
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
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        validationChecks: ['gateway-ready', 'channel-pairing-ready', 'allowlist-reviewed', 'loop-protection-reviewed'],
        diagnostics: ['missing-env', 'allowlist-empty', 'safe-to-deliver', 'gateway-status'],
        safetyBoundaries: [
          'messenger onboarding status does not mutate channel settings',
          'planned messenger adapters remain planning surfaces until verified',
          'raw channel identifiers and secrets are never returned',
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
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
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
      items: withGuideOpenPaths(XENESIS_CONNECTION_GUIDES, input.repoRoot),
    },
  };
  const rawSections: XenesisConnectionsStatus['sections'] = {
    onboarding: { id: 'onboarding', label: 'Onboarding checklist', items: onboardingItems(baseSections) },
    ...baseSections,
  };
  const sections = withXenesisConnectionSetupRequests(withXenesisConnectionDiagnosticRunbooks(rawSections));
  const summary = countItems(sections);
  return {
    ok: summary.blocked === 0,
    updatedAt: (input.now ?? new Date()).toISOString(),
    summary,
    sections,
    warnings: summary.blocked > 0 ? ['Some connections need setup before they are ready.'] : [],
  };
}
