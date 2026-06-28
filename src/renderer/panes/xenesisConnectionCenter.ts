import type {
  McpBridgeCapabilityCallRequest,
  XenesisConnectionChannelAccessGroupsTemplate,
  XenesisConnectionChannelPairingTemplate,
  XenesisConnectionChannelProfileDraftReviewStep,
  XenesisConnectionChannelProfileDraftTemplate,
  XenesisConnectionChannelRoutingTemplate,
  XenesisConnectionChannelSafetyTemplate,
  XenesisConnectionChannelUserStoryTemplate,
  XenesisConnectionDiagnosticRunbookTemplate,
  XenesisConnectionGuideCatalogTemplate,
  XenesisConnectionItem,
  XenesisConnectionMcpInstallDraftTemplate,
  XenesisConnectionMessengerViewTemplate,
  XenesisConnectionOnboardingGuidedStep,
  XenesisConnectionOnboardingPlanTemplate,
  XenesisConnectionProviderProfileDraftReviewStep,
  XenesisConnectionProviderProfileDraftTemplate,
  XenesisConnectionProviderRoutingTemplate,
  XenesisConnectionProviderSetupTemplate,
  XenesisConnectionProviderViewTemplate,
  XenesisConnectionSection,
  XenesisConnectionSetupRequestReview,
  XenesisConnectionSetupRequestTemplate,
  XenesisConnectionStatus,
  XenesisConnectionsStatus,
  XenesisConnectionToolActionCatalogTemplate,
  XenesisConnectionToolConnectorTemplate,
  XenesisConnectionToolInstallPlanTemplate,
  XenesisConnectionToolOAuthDraftReviewStep,
  XenesisConnectionToolOAuthDraftTemplate,
  XenesisConnectionToolSetupTemplate,
  XenesisConnectionToolUserStoryTemplate,
  XenesisConnectionToolViewTemplate,
} from '../../shared/types';
import {
  isXenesisConnectionCenterDetailFocus,
  type XenesisConnectionCenterDetailFocus,
} from '../../shared/xenesisConnections';

export type XenesisConnectionTone = 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'neutral';

export const XENESIS_CONNECTION_STATUS_ORDER: XenesisConnectionStatus[] = [
  'ready',
  'needs-setup',
  'blocked',
  'disabled',
  'planned',
  'unknown',
];

export const XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES = {
  'diagnostic-runbook': 'data-xenesis-connection-diagnostic-runbook',
  'setup-request': 'data-xenesis-connection-setup-request',
  'onboarding-plan': 'data-xenesis-onboarding-plan',
  'guide-catalog': 'data-xenesis-guide-catalog',
  'provider-profile-draft': 'data-xenesis-provider-profile-draft',
  'provider-setup': 'data-xenesis-provider-setup',
  'provider-routing': 'data-xenesis-provider-routing',
  'provider-view': 'data-xenesis-provider-view',
  'tool-setup': 'data-xenesis-tool-setup',
  'tool-install-plan': 'data-xenesis-tool-install-plan',
  'mcp-install-draft': 'data-xenesis-mcp-install-draft',
  'tool-oauth-draft': 'data-xenesis-tool-oauth-draft',
  'tool-action-catalog': 'data-xenesis-tool-action-catalog',
  'tool-connector': 'data-xenesis-tool-connector',
  'tool-view': 'data-xenesis-tool-view',
  'tool-user-story': 'data-xenesis-tool-user-story',
  'messenger-view': 'data-xenesis-messenger-view',
  'mcp-template': 'data-xenesis-mcp-template',
  'channel-profile-draft': 'data-xenesis-channel-profile-draft',
  'channel-template': 'data-xenesis-channel-template',
  'channel-routing': 'data-xenesis-channel-routing',
  'channel-safety': 'data-xenesis-channel-safety',
  'channel-access-groups': 'data-xenesis-channel-access-groups',
  'channel-pairing': 'data-xenesis-channel-pairing',
  'channel-user-story': 'data-xenesis-channel-user-story',
} as const satisfies Record<XenesisConnectionCenterDetailFocus, string>;

export function xenesisConnectionDetailFocusSelector(value: unknown): string | null {
  if (typeof value !== 'string' || !isXenesisConnectionCenterDetailFocus(value)) return null;
  const attribute = XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES[value];
  return attribute ? `[${attribute}]` : null;
}

export function xenesisConnectionTone(status: XenesisConnectionStatus): XenesisConnectionTone {
  switch (status) {
    case 'ready':
      return 'success';
    case 'needs-setup':
      return 'warning';
    case 'blocked':
      return 'danger';
    case 'disabled':
      return 'muted';
    case 'planned':
      return 'info';
    default:
      return 'neutral';
  }
}

export function listXenesisConnectionSections(status: XenesisConnectionsStatus | null): XenesisConnectionSection[] {
  if (!status) return [];
  return [
    status.sections.onboarding,
    status.sections.provider,
    status.sections.localCli,
    status.sections.mcp,
    status.sections.tools,
    status.sections.gateway,
    status.sections.messengers,
    status.sections.guides,
  ];
}

export function formatXenesisChannelRoutingSummary(routing: XenesisConnectionChannelRoutingTemplate): string {
  return `${routing.routeBinding} -> ${routing.defaultAgent} (${routing.sessionScope})`;
}

export function formatXenesisChannelSafetySummary(safety: XenesisConnectionChannelSafetyTemplate): string {
  return `${safety.accessModel} / ${safety.inboundBoundary} / ${safety.loopProtection.length} loop guard(s)`;
}

export function formatXenesisChannelAccessGroupsSummary(
  accessGroups: XenesisConnectionChannelAccessGroupsTemplate,
): string {
  return `${accessGroups.groupScope} / ${accessGroups.bindings.length} group binding(s) / ${
    accessGroups.failClosed ? 'fail-closed' : 'advisory'
  }`;
}

export function formatXenesisChannelPairingSummary(pairing: XenesisConnectionChannelPairingTemplate): string {
  return `${pairing.model} / ${pairing.accountScope} / ${pairing.pairingState}`;
}

export function formatXenesisChannelUserStorySummary(workflow: XenesisConnectionChannelUserStoryTemplate): string {
  return `${workflow.workflowType} / ${workflow.runtimeSupport} / ${workflow.userStories.length} user story/stories`;
}

export function formatXenesisChannelProfileDraftSummary(draft: XenesisConnectionChannelProfileDraftTemplate): string {
  return `${draft.channel} / ${draft.draftStatus} / ${draft.missingRequiredFields.length} missing field(s) / ${draft.reviewSteps.length} review step(s)`;
}

export function formatXenesisGuideCatalogSummary(guide: XenesisConnectionGuideCatalogTemplate): string {
  return `${guide.guideType} / ${guide.audience} / ${guide.coveredSurfaces.length} surface(s)`;
}

export function formatXenesisOnboardingPlanSummary(plan: XenesisConnectionOnboardingPlanTemplate): string {
  return `${plan.phase} / ${plan.validationChecks.length} validation check(s) / ${plan.guidedSteps.length} guided step(s)`;
}

export function formatXenesisConnectionGuidedStepDetail(step: XenesisConnectionOnboardingGuidedStep): string {
  return `${step.id} (${step.kind}): ${step.expectedState} / path ${step.crPath} / verify ${step.verifyWith.join(', ') || '-'} / safety ${step.safetyBoundary}`;
}

type XenesisConnectionReviewStep =
  | XenesisConnectionProviderProfileDraftReviewStep
  | XenesisConnectionToolOAuthDraftReviewStep
  | XenesisConnectionChannelProfileDraftReviewStep;

export function formatXenesisConnectionReviewStepDetail(step: XenesisConnectionReviewStep): string {
  return `${step.id} (${step.label}): ${step.expectedState} / required ${step.requiredFields.join(', ') || '-'} / read ${step.readPaths.join(', ') || '-'} / controls ${step.controlPaths.join(', ') || '-'} / diagnostics ${step.diagnostics.join(', ') || '-'} / safety ${step.safetyBoundary}`;
}

export function formatXenesisProviderSetupSummary(setup: XenesisConnectionProviderSetupTemplate): string {
  return `${setup.provider} / ${setup.model} / ${setup.authMode}`;
}

export function formatXenesisProviderProfileDraftSummary(draft: XenesisConnectionProviderProfileDraftTemplate): string {
  return `${draft.provider} / ${draft.draftStatus} / ${draft.missingRequiredFields.length} missing field(s) / ${draft.reviewSteps.length} review step(s)`;
}

export function formatXenesisProviderViewSummary(view: XenesisConnectionProviderViewTemplate): string {
  return `${view.primarySurface} / ${view.viewType}`;
}

export function formatXenesisProviderRoutingSummary(routing: XenesisConnectionProviderRoutingTemplate): string {
  return `${routing.activeProvider} -> ${routing.fallbackChain.length} fallback(s) / retries ${routing.retryPolicy.maxRetries}`;
}

export function formatXenesisToolSetupSummary(setup: XenesisConnectionToolSetupTemplate): string {
  return `${setup.connection} / ${setup.authMode} / ${setup.setupSurface}`;
}

export function formatXenesisToolActionCatalogSummary(catalog: XenesisConnectionToolActionCatalogTemplate): string {
  return `${catalog.runtimeSupport} / ${catalog.groups.length} action group(s) / ${catalog.blockedActions.length} blocked action(s)`;
}

export function formatXenesisToolViewSummary(view: XenesisConnectionToolViewTemplate): string {
  return `${view.primarySurface} / ${view.viewType}`;
}

export function formatXenesisToolConnectorSummary(connector: XenesisConnectionToolConnectorTemplate): string {
  return `${connector.connectorType} / ${connector.authMode} / ${connector.runtimeSupport}`;
}

export function formatXenesisToolInstallPlanSummary(plan: XenesisConnectionToolInstallPlanTemplate): string {
  return `${plan.installMode} / ${plan.runtimeSupport} / ${plan.installSteps.length} step(s)`;
}

export function formatXenesisMcpInstallDraftSummary(draft: XenesisConnectionMcpInstallDraftTemplate): string {
  return `${draft.serverName ?? draft.displayName} / ${draft.transport ?? 'planned'} / ${draft.draftStatus}`;
}

export function formatXenesisToolOAuthDraftSummary(draft: XenesisConnectionToolOAuthDraftTemplate): string {
  return `${draft.tool} / ${draft.draftStatus} / ${draft.scopes.length} scope(s) / ${draft.reviewSteps.length} review step(s)`;
}

export function formatXenesisToolUserStorySummary(workflow: XenesisConnectionToolUserStoryTemplate): string {
  return `${workflow.workflowType} / ${workflow.runtimeSupport} / ${workflow.userStories.length} user story/stories`;
}

export function formatXenesisMessengerViewSummary(view: XenesisConnectionMessengerViewTemplate): string {
  return `${view.primarySurface} / ${view.runtimeSupport}`;
}

export function formatXenesisConnectionDiagnosticRunbookSummary(
  runbook: XenesisConnectionDiagnosticRunbookTemplate,
): string {
  return `${runbook.readiness} / ${runbook.steps.length} diagnostic step(s)`;
}

export function formatXenesisConnectionSetupRequestSummary(request: XenesisConnectionSetupRequestTemplate): string {
  return `${request.requestType} / ${request.readiness} / ${request.steps.length} setup step(s)`;
}

export function formatXenesisConnectionSetupReviewSummary(review: XenesisConnectionSetupRequestReview): string {
  return `${review.status} / ${review.actionInboxItemId ?? review.approvalSessionKey} / ${
    review.requester || 'unknown requester'
  }`;
}

export function buildXenesisConnectionSettingsRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.settingsAction) return null;
  return {
    path: 'xd.panes.settings.open',
    args: {
      category: item.settingsAction.category,
      ...(item.settingsAction.mode ? { mode: item.settingsAction.mode } : {}),
      ...(item.settingsAction.section ? { section: item.settingsAction.section } : {}),
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisConnectionOpenRequest(item: XenesisConnectionItem): McpBridgeCapabilityCallRequest {
  return {
    path: 'xd.xenesis.connections.open',
    args: {
      id: item.id,
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisConnectionSetupRequestRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.setupRequest) return null;
  return {
    path: 'xd.xenesis.connections.setupRequests.request',
    args: {
      id: item.id,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisMcpInstallDraftRequest(item: XenesisConnectionItem): McpBridgeCapabilityCallRequest | null {
  if (!item.mcpInstallDraft) return null;
  return {
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    args: {
      id: item.id,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisMcpInstallDraftApplyRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.mcpInstallDraft) return null;
  if (item.mcpInstallDraft.draftStatus !== 'ready') return null;
  if (!item.mcpInstallDraft.controlPaths.includes('xd.xenesis.tools.mcpInstallDrafts.apply')) return null;
  return {
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    args: {
      id: item.id,
      target: 'codex',
    },
    source: 'xenesis',
    approved: false,
  };
}

export function buildXenesisToolOAuthDraftRequest(item: XenesisConnectionItem): McpBridgeCapabilityCallRequest | null {
  if (!item.toolOAuthDraft) return null;
  return {
    path: 'xd.xenesis.tools.oauthDrafts.request',
    args: {
      id: item.id,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisToolActionCatalogRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.toolActionCatalog) return null;
  return {
    path: 'xd.xenesis.tools.actions.request',
    args: {
      id: item.id,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisChannelProfileDraftRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.channelProfileDraft) return null;
  return {
    path: 'xd.xenesis.channels.profileDrafts.request',
    args: {
      channel: item.channelProfileDraft.channel,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisChannelProfileDraftApplyRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.channelProfileDraft) return null;
  if (!item.channelProfileDraft.controlPaths.includes('xd.xenesis.channels.profileDrafts.apply')) return null;
  return {
    path: 'xd.xenesis.channels.profileDrafts.apply',
    args: {
      channel: item.channelProfileDraft.channel,
    },
    source: 'xenesis',
    approved: false,
  };
}

export function buildXenesisProviderProfileDraftRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.providerProfileDraft) return null;
  return {
    path: 'xd.xenesis.providers.profileDrafts.request',
    args: {
      provider: item.providerProfileDraft.provider,
    },
    source: 'xenesis',
    approved: true,
  };
}

export function buildXenesisProviderProfileDraftApplyRequest(
  item: XenesisConnectionItem,
): McpBridgeCapabilityCallRequest | null {
  if (!item.providerProfileDraft) return null;
  if (!item.providerProfileDraft.controlPaths.includes('xd.xenesis.providers.profileDrafts.apply')) return null;
  return {
    path: 'xd.xenesis.providers.profileDrafts.apply',
    args: {
      provider: item.providerProfileDraft.provider,
    },
    source: 'xenesis',
    approved: false,
  };
}

export function buildXenesisConnectionGuideRequest(item: XenesisConnectionItem): McpBridgeCapabilityCallRequest | null {
  const guidePath = item.guideOpenPath?.trim() || item.guidePath?.trim();
  if (!guidePath) return null;
  return {
    path: 'xd.files.open',
    args: {
      filePath: guidePath,
      placement: 'tab',
    },
    source: 'xenesis',
    approved: true,
  };
}
