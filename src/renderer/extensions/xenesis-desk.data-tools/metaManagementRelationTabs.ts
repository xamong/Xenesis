export type MetaRelationViewMode = 'graph' | 'list';

export interface MetaRelationViewModeOption {
  id: MetaRelationViewMode;
  label: string;
}

export const DEFAULT_META_RELATION_VIEW_MODE: MetaRelationViewMode = 'graph';

export const META_RELATION_VIEW_MODES: MetaRelationViewModeOption[] = [
  { id: 'graph', label: 'Graph' },
  { id: 'list', label: 'List' },
];

export function resolveMetaRelationViewMode(value: unknown): MetaRelationViewMode {
  return value === 'list' ? 'list' : DEFAULT_META_RELATION_VIEW_MODE;
}
