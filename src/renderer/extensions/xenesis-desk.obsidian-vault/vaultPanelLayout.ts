import type { VaultViewerState } from './vaultTypes';

export type VaultPanelSizes = VaultViewerState['panelSizes'];
export type VaultPanelResizeTarget = keyof VaultPanelSizes;

export const defaultVaultPanelSizes: VaultPanelSizes = {
  sidebar: 300,
  inspector: 390,
  graph: 420,
};

const panelLimits: Record<VaultPanelResizeTarget, { min: number; max: number }> = {
  sidebar: { min: 220, max: 520 },
  inspector: { min: 260, max: 560 },
  graph: { min: 220, max: 720 },
};

interface RectMeasure {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

export interface VaultPanelResizeMeasure {
  clientX: number;
  clientY: number;
  shellRect: RectMeasure;
  mainRect: RectMeasure;
}

export interface VaultGraphHostMeasure {
  width?: number;
  height?: number;
}

export function normalizeVaultPanelSizes(sizes?: Partial<VaultPanelSizes>): VaultPanelSizes {
  return {
    sidebar: clampFinite(sizes?.sidebar, defaultVaultPanelSizes.sidebar, panelLimits.sidebar),
    inspector: clampFinite(sizes?.inspector, defaultVaultPanelSizes.inspector, panelLimits.inspector),
    graph: clampFinite(sizes?.graph, defaultVaultPanelSizes.graph, panelLimits.graph),
  };
}

export function resizeVaultPanelSizes(
  current: VaultPanelSizes,
  target: VaultPanelResizeTarget,
  measure: VaultPanelResizeMeasure,
): VaultPanelSizes {
  const next = normalizeVaultPanelSizes(current);
  if (target === 'sidebar') {
    next.sidebar = (measure.clientX || 0) - (measure.shellRect.left || 0);
  } else if (target === 'inspector') {
    next.inspector = (measure.shellRect.right || 0) - (measure.clientX || 0);
  } else {
    next.graph = (measure.mainRect.bottom || 0) - (measure.clientY || 0);
  }
  return normalizeVaultPanelSizes(next);
}

export function graphRenderSizeFromHost(measure: VaultGraphHostMeasure): { width: number; height: number } {
  const width = positiveFinite(measure.width, 720);
  const height = positiveFinite(measure.height, 320);
  return {
    width: Math.max(320, Math.round(width)),
    height: Math.max(220, Math.round(height)),
  };
}

function clampFinite(value: number | undefined, fallback: number, limit: { min: number; max: number }): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(limit.max, Math.max(limit.min, value)));
}

function positiveFinite(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}
