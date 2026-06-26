import type {
  McpBridgeCapabilityCallRequest,
  XenesisConnectionItem,
  XenesisConnectionSection,
  XenesisConnectionStatus,
  XenesisConnectionsStatus,
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
