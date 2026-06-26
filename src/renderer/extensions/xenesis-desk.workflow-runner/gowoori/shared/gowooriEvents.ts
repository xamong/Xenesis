export const GOWOORI_INSTANCE_EVENT = 'xenesis-desk:gowoori-instance';
export const GOWOORI_INSTANCE_REQUEST_EVENT = 'xenesis-desk:gowoori-instance-request';
export const GOWOORI_OPEN_REQUEST_EVENT = 'xenesis-desk:gowoori-open-request';
export const GOWOORI_APPLY_EVENT = 'xenesis-desk:gowoori-apply';
export const GOWOORI_OVERLAY_SHOW_EVENT = 'xenesis-desk:gowoori-overlay-show';
export const GOWOORI_OVERLAY_HIDE_EVENT = 'xenesis-desk:gowoori-overlay-hide';
export const GOWOORI_PENDING_APPLY_STORAGE_KEY = 'xenesis-desk:gowoori-pending-apply';

export type GowooriApplyMode = 'replace' | 'append';

export interface GowooriInstanceDetail {
  id: string;
  title: string;
  label: string;
  modified: boolean;
}

export interface GowooriApplyDetail {
  targetId: string;
  source: string;
  label: string;
  mode: GowooriApplyMode;
}

export interface GowooriOpenRequestDetail {
  label?: string;
}

export interface GowooriOverlayShowDetail {
  id: string;
  title: string;
  label: string;
  source: string;
  zoom?: number;
  contentId?: string;
}

export interface GowooriOverlayHideDetail {
  id?: string;
}

export function dispatchGowooriInstance(detail: GowooriInstanceDetail): void {
  window.dispatchEvent(new CustomEvent<GowooriInstanceDetail>(GOWOORI_INSTANCE_EVENT, { detail }));
}

export function dispatchGowooriOpenRequest(detail: GowooriOpenRequestDetail = {}): void {
  window.dispatchEvent(new CustomEvent<GowooriOpenRequestDetail>(GOWOORI_OPEN_REQUEST_EVENT, { detail }));
}

export function dispatchGowooriApply(detail: GowooriApplyDetail): void {
  window.dispatchEvent(new CustomEvent<GowooriApplyDetail>(GOWOORI_APPLY_EVENT, { detail }));
}

export function dispatchGowooriOverlayShow(detail: GowooriOverlayShowDetail): void {
  window.dispatchEvent(new CustomEvent<GowooriOverlayShowDetail>(GOWOORI_OVERLAY_SHOW_EVENT, { detail }));
}

export function dispatchGowooriOverlayHide(detail: GowooriOverlayHideDetail = {}): void {
  window.dispatchEvent(new CustomEvent<GowooriOverlayHideDetail>(GOWOORI_OVERLAY_HIDE_EVENT, { detail }));
}

export function isGowooriApplyDetail(value: unknown): value is GowooriApplyDetail {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GowooriApplyDetail>;
  return (
    typeof candidate.targetId === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.label === 'string' &&
    (candidate.mode === 'replace' || candidate.mode === 'append')
  );
}

export function readPendingGowooriApply(): GowooriApplyDetail | null {
  try {
    const raw = window.sessionStorage.getItem(GOWOORI_PENDING_APPLY_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(GOWOORI_PENDING_APPLY_STORAGE_KEY);
    const parsed = JSON.parse(raw) as unknown;
    return isGowooriApplyDetail(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePendingGowooriApply(detail: GowooriApplyDetail): void {
  window.sessionStorage.setItem(GOWOORI_PENDING_APPLY_STORAGE_KEY, JSON.stringify(detail));
}
