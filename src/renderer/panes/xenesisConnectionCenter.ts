import type {
  McpBridgeCapabilityCallRequest,
  XenesisConnectionChannelAccessGroupsTemplate,
  XenesisConnectionChannelPairingTemplate,
  XenesisConnectionChannelRoutingTemplate,
  XenesisConnectionChannelSafetyTemplate,
  XenesisConnectionChannelUserStoryTemplate,
  XenesisConnectionDiagnosticRunbookTemplate,
  XenesisConnectionGuideCatalogTemplate,
  XenesisConnectionItem,
  XenesisConnectionMcpInstallDraftTemplate,
  XenesisConnectionMessengerViewTemplate,
  XenesisConnectionOnboardingPlanTemplate,
  XenesisConnectionProviderRoutingTemplate,
  XenesisConnectionProviderSetupTemplate,
  XenesisConnectionProviderViewTemplate,
  XenesisConnectionSection,
  XenesisConnectionSetupRequestReview,
  XenesisConnectionSetupRequestTemplate,
  XenesisConnectionStatus,
  XenesisConnectionsStatus,
  XenesisConnectionToolConnectorTemplate,
  XenesisConnectionToolInstallPlanTemplate,
  XenesisConnectionToolSetupTemplate,
  XenesisConnectionToolUserStoryTemplate,
  XenesisConnectionToolViewTemplate,
} from '../../shared/types';

export type XenesisConnectionTone = 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'neutral';

export const XENESIS_CONNECTION_STATUS_ORDER: XenesisConnectionStatus[] = [
  'ready',
  'needs-setup',
  'blocked',
  'disabled',
  'planned',
  'unknown',
];

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

export function formatXenesisGuideCatalogSummary(guide: XenesisConnectionGuideCatalogTemplate): string {
  return `${guide.guideType} / ${guide.audience} / ${guide.coveredSurfaces.length} surface(s)`;
}

export function formatXenesisOnboardingPlanSummary(plan: XenesisConnectionOnboardingPlanTemplate): string {
  return `${plan.phase} / ${plan.validationChecks.length} validation check(s)`;
}

export function formatXenesisProviderSetupSummary(setup: XenesisConnectionProviderSetupTemplate): string {
  return `${setup.provider} / ${setup.model} / ${setup.authMode}`;
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
