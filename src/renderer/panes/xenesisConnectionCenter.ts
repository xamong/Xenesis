import type { XenesisConnectionSection, XenesisConnectionStatus, XenesisConnectionsStatus } from '../../shared/types';

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
    status.sections.provider,
    status.sections.localCli,
    status.sections.mcp,
    status.sections.tools,
    status.sections.gateway,
    status.sections.messengers,
    status.sections.guides,
  ];
}
