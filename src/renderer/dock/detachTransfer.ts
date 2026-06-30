import type { DetachPayload, FileApi } from '../../shared/types';
import type { DetachMode } from './useDragManager';

export interface DockTransferApi {
  detachTab?: FileApi['detachTab'];
  reattachDrop?: FileApi['reattachDrop'];
  mergeTabToDetached?: FileApi['mergeTabToDetached'];
}

export interface DockTransferLabels {
  unavailable: string;
  success: string;
  failure: (error: unknown) => string;
}

export interface DockTransferOptions {
  mode: DetachMode;
  targetWindowId?: number;
  payload: DetachPayload;
  contentId: string;
  terminalTermId?: string;
  api: DockTransferApi;
  closeContent: (contentId: string) => void;
  releaseTerminal: (termId: string) => void;
  closeCurrentWindowIfEmpty: () => void;
  onStatus: (message: string) => void;
  labels: DockTransferLabels;
}

function resolveTransferOperation({
  mode,
  targetWindowId,
  payload,
  api,
}: Pick<DockTransferOptions, 'mode' | 'targetWindowId' | 'payload' | 'api'>): (() => Promise<void>) | null {
  if (mode === 'reattach') {
    const reattachDrop = api.reattachDrop;
    return typeof reattachDrop === 'function' ? () => reattachDrop(payload) : null;
  }

  if (mode === 'merge-to-detached') {
    const mergeTabToDetached = api.mergeTabToDetached;
    if (typeof mergeTabToDetached !== 'function' || targetWindowId == null) return null;
    return () => mergeTabToDetached(payload, targetWindowId);
  }

  const detachTab = api.detachTab;
  return typeof detachTab === 'function' ? () => detachTab(payload) : null;
}

export async function runDockTransfer(options: DockTransferOptions): Promise<boolean> {
  const operation = resolveTransferOperation(options);
  if (!operation) {
    options.onStatus(options.labels.unavailable);
    return false;
  }

  try {
    await operation();
    if (options.terminalTermId) {
      options.releaseTerminal(options.terminalTermId);
    }
    options.closeContent(options.contentId);
    options.onStatus(options.labels.success);
    options.closeCurrentWindowIfEmpty();
    return true;
  } catch (error) {
    options.onStatus(options.labels.failure(error));
    return false;
  }
}
