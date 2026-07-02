import type { BrowserSourceKind, BrowserSourceResult } from '../../shared/types';

export type BrowserViewMode = 'preview' | 'source' | 'split';

export interface BrowserSourceState {
  text: string;
  kind: BrowserSourceKind;
  url: string;
  loading: boolean;
  error?: string;
  stale?: boolean;
}

export interface LocalBrowserSourceInput {
  text: string;
  url: string;
  kind: Extract<BrowserSourceKind, 'local-file' | 'dropped-file'>;
}

export interface ResolveRemoteBrowserSourceInput {
  url: string;
  loadResponseSource: (url: string) => Promise<BrowserSourceResult>;
  readDomSnapshot: () => Promise<string>;
}

const browserSourceKindLabels: Record<BrowserSourceKind, string> = {
  'local-file': 'Local file',
  'dropped-file': 'Dropped file',
  'response-source': 'Response source',
  'dom-snapshot': 'DOM snapshot',
  unavailable: 'Unavailable',
};

export function getBrowserSourceKindLabel(kind: BrowserSourceKind): string {
  return browserSourceKindLabels[kind];
}

export function canEditBrowserSource(kind: BrowserSourceKind): boolean {
  return kind === 'local-file' || kind === 'dropped-file';
}

export function canSaveBrowserSource(kind: BrowserSourceKind, filePath?: string): boolean {
  return kind === 'local-file' && Boolean(filePath?.trim());
}

export function createLocalBrowserSourceState(input: LocalBrowserSourceInput): BrowserSourceState {
  return {
    text: input.text,
    kind: input.kind,
    url: input.url,
    loading: false,
  };
}

export function markBrowserSourceStale(state: BrowserSourceState, url: string): BrowserSourceState {
  if (state.url === url) return state;
  return { ...state, url, stale: true };
}

export async function resolveRemoteBrowserSource(input: ResolveRemoteBrowserSourceInput): Promise<BrowserSourceState> {
  let responseError = '';
  try {
    const result = await input.loadResponseSource(input.url);
    if (result.ok && typeof result.source === 'string' && result.source.length > 0) {
      return {
        text: result.source,
        kind: result.kind === 'response-source' ? 'response-source' : result.kind,
        url: result.finalUrl || input.url,
        loading: false,
      };
    }
    responseError = result.error || 'Response source unavailable.';
  } catch (error) {
    responseError = error instanceof Error ? error.message : String(error);
  }

  try {
    const snapshot = await input.readDomSnapshot();
    if (snapshot.trim()) {
      return {
        text: snapshot,
        kind: 'dom-snapshot',
        url: input.url,
        loading: false,
      };
    }
  } catch (error) {
    const domError = error instanceof Error ? error.message : String(error);
    return {
      text: '',
      kind: 'unavailable',
      url: input.url,
      loading: false,
      error: `${responseError} ${domError}`.trim(),
    };
  }

  return {
    text: '',
    kind: 'unavailable',
    url: input.url,
    loading: false,
    error: responseError || 'Source unavailable.',
  };
}
