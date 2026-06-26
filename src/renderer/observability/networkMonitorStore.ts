import {
  createNetworkMonitorCollector,
  type NetworkRequestEntry,
  type NetworkRequestMethod,
  type NetworkRequestSource,
} from '../extensions/xenesis-desk.core-tools/panes/networkMonitorCollector';

export const networkMonitorStore = createNetworkMonitorCollector();

export function recordNetworkEntry(entry: Omit<NetworkRequestEntry, 'id'>): string {
  return networkMonitorStore.record(entry);
}

export function completeNetworkEntry(id: string, update: Partial<NetworkRequestEntry>): void {
  networkMonitorStore.complete(id, update);
}

export type { NetworkRequestEntry, NetworkRequestMethod, NetworkRequestSource };
